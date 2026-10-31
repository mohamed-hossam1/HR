"use client";

import React, { useState } from "react";
import { STATUS_LABELS, formatCairoDate, formatBytesArabic, formatStatusHistoryNote } from "@/lib/validation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
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
  Trash2,
  AlertTriangle,
  Paperclip,
} from "lucide-react";

interface AdminCaseDetailProps {
  initialCase: any;
  auditLogs?: any[];
}

export function AdminCaseDetail({ initialCase }: AdminCaseDetailProps) {
  const router = useRouter();
  const [caseData, setCaseData] = useState(initialCase);
  const [messages, setMessages] = useState<any[]>(initialCase.messages || []);
  const [attachments, setAttachments] = useState<any[]>(initialCase.attachments || []);

  // Status Change State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(initialCase.status);
  const [statusNote, setStatusNote] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  // Delete Case State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingCase, setIsDeletingCase] = useState(false);

  const statusConfig = STATUS_LABELS[caseData.status] || {
    label: caseData.status,
    color: "text-slate-700",
    bg: "bg-slate-100",
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

      const prevLabel = STATUS_LABELS[caseData.status]?.label || caseData.status;
      const newLabel = STATUS_LABELS[selectedStatus]?.label || selectedStatus;
      const historyNote = statusNote.trim()
        ? formatStatusHistoryNote(statusNote.trim())
        : `تم تغيير الحالة من "${prevLabel}" إلى "${newLabel}"`;

      setCaseData((prev: any) => ({
        ...prev,
        status: selectedStatus,
        history: [
          {
            id: String(Date.now()),
            previous_status: prev.status,
            new_status: selectedStatus,
            actor: "مدير الموارد البشرية",
            note: historyNote,
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
        let isUploaded = false;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const uploadRes = await fetch(ticket.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": uploadFile.type || "application/octet-stream" },
            body: uploadFile,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (uploadRes.ok) {
            isUploaded = true;
          }
        } catch (s3Err) {
          console.warn("Direct upload hit browser restriction, using secure proxy fallback:", s3Err);
        }

        if (!isUploaded) {
          const formData = new FormData();
          formData.append("file", uploadFile);
          formData.append("ticketToken", ticket.ticketToken);
          formData.append("storageKey", ticket.storageKey);

          const fallbackRes = await fetch("/api/upload/direct", {
            method: "POST",
            body: formData,
          });

          if (!fallbackRes.ok) {
            const errJson = await fallbackRes.json().catch(() => ({}));
            throw new Error(errJson.error || "فشل إرسال الملف إلى التخزين.");
          }
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
          senderPortal: "admin",
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

      if (msgData.attachments && msgData.attachments.length > 0) {
        setAttachments((prev) => [...prev, ...msgData.attachments]);
      } else if (uploadFile && newAttachmentsPayload.length > 0) {
        setAttachments((prev) => [
          ...prev,
          {
            id: newAttachmentsPayload[0].storageKey,
            messageId: msgData.message.id,
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

  // Delete Case
  const handleDeleteCase = async () => {
    setIsDeletingCase(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/cases/${caseData.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حذف المعاملة");

      router.push(backLink);
      router.refresh();
    } catch (err: any) {
      setActionError(err.message || "حدث خطأ أثناء محاولة حذف المعاملة");
      setIsDeletingCase(false);
      setShowDeleteModal(false);
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

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Trash2 className="w-3.5 h-3.5 ml-1" />
                حذف {caseData.case_type === "request" ? "الطلب" : "الشكوى"}
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

      {/* Official HR Response Documents Card */}
      {attachments.filter((a) => a.uploaderType === "hr").length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
          <CardHeader className="pb-3 border-b border-emerald-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
              <FileCheck className="w-5 h-5 text-emerald-700" />
              <span>المستندات والقرارات الصادرة من الموارد البشرية للموظف ({attachments.filter((a) => a.uploaderType === "hr").length})</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
              مستندات صادرة ومتاحة للموظف
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {attachments
              .filter((a) => a.uploaderType === "hr")
              .map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs uppercase shrink-0">
                      {doc.filename.split(".").pop() || "FILE"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{doc.filename}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>{formatBytesArabic(doc.fileSize)}</span>
                        <span>•</span>
                        <span>تاريخ الرفع: {formatCairoDate(doc.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={doc.filename}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-xs shrink-0"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>تحميل / معاينة المستند</span>
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
                    {hist.actor && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        ({hist.actor === "employee" ? "بواسطة: الموظف" : `بواسطة: ${hist.actor}`})
                      </span>
                    )}
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
                const msgAttachments = attachments.filter((a) => a.messageId === m.id);

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

                      {msgAttachments.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-600 block">
                            المستندات المرفقة مع هذه الرسالة ({msgAttachments.length}):
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
                                <FileDown className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                                <span className="truncate font-semibold">{att.filename}</span>
                                {att.fileSize && (
                                  <span className="text-[10px] text-slate-400 shrink-0">
                                    ({formatBytesArabic(att.fileSize)})
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-bold text-blue-900 shrink-0 hover:underline">
                                تحميل / معاينة
                              </span>
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
                    <option value="pending">في الانتظار</option>
                    <option value="in_progress">قيد التنفيذ</option>
                    <option value="awaiting_employee">بانتظار استكمال بيانات</option>
                    <option value="completed">مكتمل</option>
                    <option value="rejected">مرفوض</option>
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

      {/* Delete Case Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-white shadow-2xl border-rose-200 animate-in fade-in zoom-in-95 text-right">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>تأكيد حذف {caseData.case_type === "request" ? "الطلب" : "الشكوى"} نهائياً</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900 leading-relaxed">
                <p className="font-bold">
                  هل أنت متأكد من رغبتك في حذف هذا {caseData.case_type === "request" ? "الطلب" : "الشكوى"}؟
                </p>
                <div className="text-[11px] text-rose-700 space-y-1">
                  <div>• رقم المعاملة: <span className="font-mono font-bold">{caseData.reference}</span></div>
                  <div>• اسم الموظف: <span className="font-semibold">{caseData.employee_name}</span></div>
                  <div>• الرقم الثابت: <span className="font-mono font-semibold">{caseData.employee_number}</span></div>
                  <div>• الفئة: <span className="font-semibold">{caseData.category_name_ar}</span></div>
                </div>
                <div className="text-[11px] text-rose-800 font-semibold flex items-start gap-1.5 pt-1">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>
                    تحذير: هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم مسح كافة البيانات والمستندات المرفقة والمحادثات المرتبطة بهذه المعاملة نهائياً.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDeletingCase}
                  onClick={() => setShowDeleteModal(false)}
                  className="text-xs font-semibold"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isDeletingCase}
                  onClick={handleDeleteCase}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                >
                  {isDeletingCase ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                      <span>تأكيد الحذف النهائي</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
