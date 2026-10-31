"use client";

import React, { useState } from "react";
import { STATUS_LABELS, formatCairoDate, formatBytesArabic } from "@/lib/validation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  Phone,
  Hash,
  Briefcase,
  FileDown,
  UploadCloud,
  Send,
  Lock,
  MessageSquare,
  Edit,
  History,
  FileCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";

interface AdminCaseDetailProps {
  initialCase: any;
  auditLogs: any[];
}

export function AdminCaseDetail({ initialCase, auditLogs }: AdminCaseDetailProps) {
  const [caseData, setCaseData] = useState(initialCase);
  const [messages, setMessages] = useState<any[]>(initialCase.messages || []);
  const [attachments, setAttachments] = useState<any[]>(initialCase.attachments || []);

  // Status Change State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(initialCase.status);
  const [statusNote, setStatusNote] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Identity Verification State
  const [isVerifying, setIsVerifying] = useState(false);

  // Message / Document Response State
  const [messageText, setMessageText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Edit Case Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(initialCase.employee_name);
  const [editPhone, setEditPhone] = useState(initialCase.phone_number);
  const [editProfession, setEditProfession] = useState(initialCase.profession || "");
  const [editReason, setEditReason] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusConfig = STATUS_LABELS[caseData.status] || {
    label: caseData.status,
    color: "text-slate-700",
    bg: "bg-slate-100",
  };

  // Toggle Identity Verification
  const handleToggleVerification = async () => {
    setIsVerifying(true);
    setActionError(null);
    try {
      const nextVal = !caseData.is_identity_verified;
      const res = await fetch(`/api/admin/cases/${caseData.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: nextVal }),
      });
      if (!res.ok) throw new Error("فشل تعديل حالة التحقق");
      setCaseData((prev: any) => ({ ...prev, is_identity_verified: nextVal }));
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/cases/${caseData.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStatus: selectedStatus,
          note: statusNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تغيير الحالة");

      setCaseData((prev: any) => ({
        ...prev,
        status: selectedStatus,
        history: [
          {
            id: String(Date.now()),
            previous_status: prev.status,
            new_status: selectedStatus,
            actor: "مدير الموارد البشرية",
            note: statusNote || undefined,
            created_at: new Date().toISOString(),
          },
          ...(prev.history || []),
        ],
      }));
      setShowStatusModal(false);
      setStatusNote("");
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Send Message / Response Document
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && !uploadFile) return;

    setIsSendingMessage(true);
    setActionError(null);

    try {
      const newAttachmentsPayload: any[] = [];

      // 1. If file selected, upload via ticket
      if (uploadFile) {
        setUploadStatus("جاري إصدار تصريح رفع المستند...");
        const ticketRes = await fetch("/api/upload/ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: uploadFile.name,
            mimeType: uploadFile.type || "application/octet-stream",
            fileSize: uploadFile.size,
            caseId: caseData.id,
            uploaderType: "hr",
          }),
        });

        if (!ticketRes.ok) {
          const errData = await ticketRes.json().catch(() => ({}));
          throw new Error(errData.error || "فشل الحصول على تصريح رفع المستند");
        }

        const ticket = await ticketRes.json();

        setUploadStatus("جاري رفع المستند السحابي...");
        const uploadRes = await fetch(ticket.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": uploadFile.type || "application/octet-stream" },
          body: uploadFile,
        });

        if (!uploadRes.ok) {
          throw new Error("فشل إرسال الملف إلى التخزين.");
        }

        newAttachmentsPayload.push({
          ticketToken: ticket.ticketToken,
          storageKey: ticket.storageKey,
          filename: uploadFile.name,
          fileSize: uploadFile.size,
          mimeType: uploadFile.type || "application/octet-stream",
        });
      }

      setUploadStatus("جاري حفظ الرسالة...");
      const msgRes = await fetch(`/api/cases/${caseData.reference}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageBody: messageText.trim() || "مرفق مستند رسمي من الموارد البشرية",
          isInternal: isInternalNote,
          attachments: newAttachmentsPayload,
        }),
      });

      const msgData = await msgRes.json();
      if (!msgRes.ok) {
        throw new Error(msgData.error || "فشل إرسال الرسالة");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: msgData.message.id,
          sender_type: "hr",
          sender_name: "الموارد البشرية",
          message_body: msgData.message.message_body,
          is_internal: isInternalNote,
          created_at: new Date().toISOString(),
        },
      ]);

      if (uploadFile && newAttachmentsPayload.length > 0) {
        setAttachments((prev) => [
          ...prev,
          {
            id: newAttachmentsPayload[0].storageKey,
            filename: uploadFile.name,
            fileSize: uploadFile.size,
            fileType: uploadFile.type,
            uploaderType: "hr",
            downloadUrl: URL.createObjectURL(uploadFile),
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      setMessageText("");
      setUploadFile(null);
      setIsInternalNote(false);
      setUploadStatus(null);
    } catch (err: any) {
      setActionError(err.message || "حدث خطأ أثناء الإرسال");
    } finally {
      setIsSendingMessage(false);
      setUploadStatus(null);
    }
  };

  // Edit Case
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReason.trim()) {
      setActionError("يرجى كتابة سبب التعديل لسجل التدقيق");
      return;
    }

    setIsSavingEdit(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/cases/${caseData.id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_name: editName.trim(),
          phone_number: editPhone.trim(),
          profession: editProfession.trim() || null,
          reason: editReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حفظ التعديلات");

      setCaseData((prev: any) => ({
        ...prev,
        employee_name: editName.trim(),
        phone_number: editPhone.trim(),
        profession: editProfession.trim() || null,
      }));

      setShowEditModal(false);
      setEditReason("");
    } catch (err: any) {
      setActionError(err.message || "حدث خطأ أثناء تعديل البيانات");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const backLink = caseData.case_type === "request" ? "/admin/requests" : "/admin/complaints";
  const backLabel = caseData.case_type === "request" ? "قائمة الطلبات" : "قائمة الشكاوى";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Back button */}
      <Link
        href={backLink}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-900 transition-colors"
      >
        <ArrowRight className="w-3.5 h-3.5" />
        <span>العودة إلى {backLabel}</span>
      </Link>

      {/* Top Banner Card */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-blue-900">
                  {caseData.reference}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-500">
                  {caseData.case_type === "request" ? "طلب" : "شكوى"}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                {caseData.category_name_ar}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`inline-flex px-3.5 py-1 rounded-full text-xs font-bold border ${statusConfig.bg} ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>

              <Button
                variant="default"
                size="sm"
                onClick={() => setShowStatusModal(true)}
                className="text-xs font-bold"
              >
                تغيير الحالة
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className="text-xs font-bold"
              >
                <Edit className="w-3.5 h-3.5 ml-1" />
                تعديل البيانات
              </Button>
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">اسم الموظف:</span>
              <span className="font-bold text-slate-900 text-sm">{caseData.employee_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">الرقم الثابت:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {caseData.employee_number}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">رقم الموبايل:</span>
              <span className="font-mono font-bold text-slate-900 text-sm" dir="ltr">
                {caseData.phone_number}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">تاريخ التقديم:</span>
              <span className="font-medium text-slate-700">
                {formatCairoDate(caseData.submission_date)}
              </span>
            </div>
          </div>

          {/* Identity Verification Toggle */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              {caseData.is_identity_verified ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              )}
              <div>
                <p className="text-xs font-bold text-slate-800">
                  حالة التحقق اليدوي من هوية الموظف:{" "}
                  {caseData.is_identity_verified ? (
                    <span className="text-emerald-700">تم التحقق يدوياً بمطابقة المستندات</span>
                  ) : (
                    <span className="text-amber-700">لم يتم التحقق يدوياً بعد</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500">
                  يجب مطابقة بطاقة الرقم القومي قبل تسليم مستندات الرواتب أو البيانات السرية
                </p>
              </div>
            </div>

            <Button
              variant={caseData.is_identity_verified ? "outline" : "success"}
              size="sm"
              onClick={handleToggleVerification}
              disabled={isVerifying}
              className="text-xs font-bold cursor-pointer"
            >
              {caseData.is_identity_verified ? "إلغاء التحقق" : "تأكيد التحقق من الهوية"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Form Answers & Encrypted Sensitive Data */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900">
            إجابات وبيانات النموذج الإلكتروني
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Decrypted sensitive data (e.g. National ID) */}
            {caseData.sensitiveValues &&
              Object.entries(caseData.sensitiveValues).map(([key, val]) => (
                <div
                  key={key}
                  className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1"
                >
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>الرقم القومي (مفكوك التشفير للمدير فقط):</span>
                  </span>
                  <span className="font-mono text-base font-extrabold text-slate-900 block">
                    {String(val)}
                  </span>
                </div>
              ))}

            {caseData.category_schema_snapshot?.map((field: any) => {
              if (field.type === "image" || field.is_sensitive) return null;
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

          {/* Employee Attachments */}
          {attachments.filter((a) => a.uploaderType === "employee").length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 block mb-3">
                الصور والمستندات المرفوعة من الموظف:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {attachments
                  .filter((a) => a.uploaderType === "employee")
                  .map((img: any) => (
                    <a
                      key={img.id}
                      href={img.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group block p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 bg-white transition-all text-center"
                    >
                      <div className="h-32 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center mb-2">
                        <img
                          src={img.downloadUrl}
                          alt={img.filename}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {img.filename}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {formatBytesArabic(img.fileSize)}
                      </span>
                    </a>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages & HR Responses */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <MessageSquare className="w-4 h-4 text-blue-900" />
            <span>المراسلات والردود الرسمية والملاحظات الداخلية</span>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">
                لا توجد مراسلات سابقة في هذه المعاملة.
              </p>
            ) : (
              messages.map((m: any) => {
                const isHR = m.sender_type === "hr";
                const isInternal = Boolean(m.is_internal);

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isHR ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                        isInternal
                          ? "bg-amber-50 border border-amber-300 text-amber-950"
                          : isHR
                          ? "bg-blue-50 border border-blue-200 text-slate-800"
                          : "bg-slate-100 border border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold mb-1.5">
                        {isInternal ? (
                          <span className="text-amber-800 flex items-center gap-1 font-bold">
                            <Lock className="w-3.5 h-3.5" />
                            ملاحظة داخلية سرية (لا تظهر للموظف)
                          </span>
                        ) : (
                          <span className={isHR ? "text-blue-900" : "text-slate-700"}>
                            {isHR ? "الموارد البشرية" : m.sender_name || "مقدم الطلب"}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-normal">
                          {formatCairoDate(m.created_at)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.message_body}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Form to Send Reply or Upload Response Document */}
          <form onSubmit={handleSendMessage} className="pt-5 border-t border-slate-100 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                كتابة رد أو إرسال مستند:
              </label>
              <Textarea
                placeholder="اكتب ردك أو التوجيه الخاص بالمعاملة..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="text-xs"
                rows={3}
              />
            </div>

            {/* Document Upload for HR */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-800">
                إرفاق مستند رسمي (PDF, Word, Excel, صور — حتى 5 ميجابايت):
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.xlsx,image/jpeg,image/png,image/webp"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-900 file:text-white hover:file:bg-blue-800 cursor-pointer"
              />
              {uploadFile && (
                <p className="text-xs text-emerald-700 font-semibold">
                  تم تحديد: {uploadFile.name} ({formatBytesArabic(uploadFile.size)})
                </p>
              )}
            </div>

            {/* Internal Note Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isInternalNote"
                checked={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded-sm border-slate-300"
              />
              <label
                htmlFor="isInternalNote"
                className="text-xs text-amber-900 font-bold cursor-pointer flex items-center gap-1"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                حفظ كملاحظة داخلية سرية (تظهر للإدارة فقط ولا يراها الموظف)
              </label>
            </div>

            {uploadStatus && (
              <p className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {uploadStatus}
              </p>
            )}

            <Button
              type="submit"
              size="sm"
              isLoading={isSendingMessage}
              disabled={!messageText.trim() && !uploadFile}
              className="text-xs font-bold"
            >
              <Send className="w-3.5 h-3.5 ml-1" />
              {isInternalNote ? "حفظ الملاحظة الداخلية" : "إرسال الرد والمستند"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Audit History Card */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <History className="w-4 h-4 text-blue-900" />
            <span>سجل تدقيق الإجراءات الإدارية (Audit Trail)</span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400">لا توجد سجلات تدقيق سابقة لهذه المعاملة.</p>
            ) : (
              auditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{log.action}</span>
                    <span className="text-slate-400">{formatCairoDate(log.created_at)}</span>
                  </div>
                  <p className="text-slate-600">بواسطة: {log.actor}</p>
                  {log.details && (
                    <pre className="text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Modal Dialog */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white shadow-xl">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                تعديل حالة المعاملة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    اختر الحالة الجديدة:
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="pending">في الانتظار (pending)</option>
                    <option value="in_progress">قيد التنفيذ (in_progress)</option>
                    <option value="awaiting_employee">
                      بانتظار استكمال بيانات (awaiting_employee)
                    </option>
                    <option value="completed">مكتمل (completed)</option>
                    <option value="rejected">مرفوض (rejected)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    ملاحظة أو سبب التغيير (اختياري / مطلوب في حال الرفض):
                  </label>
                  <Textarea
                    placeholder="مثال: تم إرسال الشهادة، أو تم رفض الطلب لعدم اكتمال مسوغات التعيين..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    className="flex-1 text-xs font-bold"
                    isLoading={isUpdatingStatus}
                  >
                    حفظ التغيير
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowStatusModal(false)}
                    className="text-xs"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Case Modal Dialog */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white shadow-xl">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                تعديل وتصحيح بيانات المعاملة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اسم الموظف:</label>
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">رقم الموبايل:</label>
                  <Input
                    type="tel"
                    dir="ltr"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    المهنة / المسمى الوظيفي:
                  </label>
                  <Input
                    type="text"
                    value={editProfession}
                    onChange={(e) => setEditProfession(e.target.value)}
                  />
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <label className="block font-bold text-amber-900 mb-1">
                    سبب التعديل (إلزامي لسجل التدقيق): <span className="text-rose-600">*</span>
                  </label>
                  <Textarea
                    placeholder="اكتب سبب تصحيح البيانات بناءً على طلب الموظف أو مراجعة الملف..."
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    required
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    className="flex-1 text-xs font-bold"
                    isLoading={isSavingEdit}
                  >
                    حفظ التعديلات
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEditModal(false)}
                    className="text-xs"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
