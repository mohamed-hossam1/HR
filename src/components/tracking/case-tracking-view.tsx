"use client";

import React, { useState } from "react";
import { STATUS_LABELS, formatCairoDate, formatBytesArabic, formatStatusHistoryNote } from "@/lib/validation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader, UploadedAttachment } from "@/components/ui/image-uploader";
import {
  Clock,
  Send,
  FileDown,
  MessageSquare,
  ShieldAlert,
  Calendar,
  User,
  Phone,
  Hash,
  Paperclip,
  CheckCircle,
} from "lucide-react";

interface CaseTrackingViewProps {
  caseData: any;
}

export function CaseTrackingView({ caseData }: CaseTrackingViewProps) {
  const [messages, setMessages] = useState<any[]>(caseData.messages || []);
  const [attachments, setAttachments] = useState<any[]>(caseData.attachments || []);
  const [replyText, setReplyText] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<UploadedAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusConfig = STATUS_LABELS[caseData.status] || {
    label: caseData.status,
    color: "text-slate-700",
    bg: "bg-slate-100 border-slate-200",
  };

  const hrAttachments = attachments.filter((a) => a.uploaderType === "hr");
  const employeeAttachments = attachments.filter((a) => a.uploaderType === "employee");

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && replyAttachments.length === 0) return;

    setIsSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/cases/${caseData.reference}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderPortal: "employee",
          messageBody: replyText.trim(),
          isInternal: false,
          attachments: replyAttachments.map((a) => ({
            ticketToken: a.ticketToken,
            storageKey: a.storageKey,
            filename: a.filename,
            fileSize: a.fileSize,
            mimeType: a.mimeType,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل إرسال الرسالة.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: data.message.id,
          sender_type: "employee",
          sender_name: caseData.employee_name,
          message_body: replyText.trim(),
          created_at: new Date().toISOString(),
        },
      ]);

      // Add new attachments with message association
      if (data.attachments && data.attachments.length > 0) {
        setAttachments((prev) => [...prev, ...data.attachments]);
      } else if (replyAttachments.length > 0) {
        setAttachments((prev) => [
          ...prev,
          ...replyAttachments.map((a) => ({
            id: a.storageKey,
            messageId: data.message.id,
            filename: a.filename,
            fileSize: a.fileSize,
            fileType: a.mimeType,
            uploaderType: "employee",
            downloadUrl: a.previewUrl,
            createdAt: new Date().toISOString(),
          })),
        ]);
      }

      setReplyText("");
      setReplyAttachments([]);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إرسال الرسالة.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header Banner */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-500">
                  {caseData.case_type === "request" ? "طلب إلكتروني" : "شكوى وتظلم"}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-sm font-bold text-blue-900">
                  {caseData.reference}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{caseData.category_name_ar}</h1>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span
                className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span>
                <strong>الاسم:</strong> {caseData.employee_name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" />
              <span>
                <strong>الرقم الثابت:</strong> {caseData.employee_number}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                <strong>تاريخ التقديم:</strong> {formatCairoDate(caseData.submission_date)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Official HR Response Documents */}
      {hrAttachments.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
          <CardHeader className="pb-3 border-b border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <FileDown className="w-5 h-5 text-emerald-700" />
              <span>مستندات وشهادات صادرة من الإدارة المختصة بالقطاع</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {hrAttachments.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase">
                    {doc.filename.split(".").pop() || "FILE"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{doc.filename}</p>
                    <p className="text-xs text-slate-500">{formatBytesArabic(doc.fileSize)}</p>
                  </div>
                </div>

                <a
                  href={doc.downloadUrl}
                  download={doc.filename}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تحميل الملف</span>
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Status History / Timeline */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Clock className="w-4 h-4 text-blue-900" />
            <span>سجل وتطورات الحالة</span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4 relative before:absolute before:inset-0 before:right-3 before:w-0.5 before:bg-slate-200">
            {caseData.history?.map((hist: any, index: number) => {
              const histStatus = STATUS_LABELS[hist.new_status] || {
                label: hist.new_status,
                color: "text-slate-700",
                bg: "bg-slate-100",
              };

              return (
                <div key={hist.id || index} className="relative pr-8 space-y-1">
                  <div className="absolute right-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-900 border-2 border-white ring-2 ring-slate-200" />
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${histStatus.bg} ${histStatus.color}`}
                    >
                      {histStatus.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatCairoDate(hist.created_at)}
                    </span>
                  </div>
                  {hist.note && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1">
                      {formatStatusHistoryNote(hist.note)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submitted Form Data */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900">
            البيانات والمستندات المسجلة في الطلب
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {caseData.category_schema_snapshot?.map((field: any) => {
              if (field.type === "image") return null;
              const val = caseData.answers?.[field.id];
              return (
                <div key={field.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-500 block mb-1">
                    {field.label_ar}:
                  </span>
                  <span className="font-medium text-slate-900 text-sm">
                    {val !== undefined && val !== null ? String(val) : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {employeeAttachments.length > 0 && (
            <div className="pt-3">
              <span className="text-xs font-semibold text-slate-500 block mb-2">
                الصور والمستندات المرفقة مع الطلب:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {employeeAttachments.map((img: any) => (
                  <a
                    key={img.id}
                    href={img.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group block p-2 rounded-xl border border-slate-200 hover:border-blue-500 bg-white transition-all text-center"
                  >
                    <div className="h-24 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center mb-1.5">
                      <img
                        src={img.downloadUrl}
                        alt={img.filename}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-700 truncate block">
                      {img.filename}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages Thread */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <MessageSquare className="w-4 h-4 text-blue-900" />
            <span>المراسلات والملاحظات بين العامل والإدارة المختصة بالقطاع</span>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">
                لا توجد مراسلات سابقة حتى الآن في هذه المعاملة.
              </p>
            ) : (
              messages.map((m: any) => {
                const isHR = m.sender_type === "hr";
                const msgAttachments = attachments.filter((a) => a.messageId === m.id);

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isHR ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                        isHR
                          ? "bg-blue-50 border border-blue-200 text-slate-800"
                          : "bg-slate-100 border border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold mb-1.5">
                        <span className={isHR ? "text-blue-900" : "text-slate-700"}>
                          {isHR ? "الموارد البشرية" : m.sender_name || "مقدم الطلب"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {formatCairoDate(m.created_at)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.message_body}</p>

                      {msgAttachments.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-500 block">
                            المرفقات ({msgAttachments.length}):
                          </span>
                          {msgAttachments.map((att: any) => (
                            <a
                              key={att.id}
                              href={att.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              download={att.filename}
                              className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/90 hover:bg-white border border-slate-200 text-slate-800 transition-colors shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                                <span className="truncate font-semibold">{att.filename}</span>
                                {att.fileSize && (
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    ({formatBytesArabic(att.fileSize)})
                                  </span>
                                )}
                              </div>
                              <FileDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-100 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              إرسال استفسار أو رد للإدارة المختصة بالقطاع:
            </label>
            <Textarea
              placeholder="اكتب ردك أو استفسارك هنا..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="text-xs"
              rows={3}
            />

            {/* Optional Additional Images when HR requested information */}
            <div className="pt-1">
              <ImageUploader
                fieldId="reply_evidence"
                label="إرفاق صور أو مستندات إضافية (اختياري)"
                description="في حال طلبت الإدارة المختصة صورًا إضافية لاستكمال الطلب"
                maxImages={3}
                totalCurrentImages={attachments.length + replyAttachments.length}
                maxTotalAllowed={15}
                attachments={replyAttachments}
                onAttachmentsChange={setReplyAttachments}
              />
            </div>

            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

            <Button
              type="submit"
              size="sm"
              isLoading={isSending}
              disabled={!replyText.trim() && replyAttachments.length === 0}
            >
              <Send className="w-3.5 h-3.5 ml-1" />
              إرسال الرد
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
