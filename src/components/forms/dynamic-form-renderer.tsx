"use client";

import React, { useState } from "react";
import { FormFieldDefinition } from "@/db/schema";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUploader, UploadedAttachment } from "@/components/ui/image-uploader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Layers,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { formatCairoDate } from "@/lib/validation";

interface DynamicFormRendererProps {
  category: {
    id: string;
    slug: string;
    type: "request" | "complaint";
    name_ar: string;
    description_ar: string | null;
    field_schema: FormFieldDefinition[];
  };
}

export function DynamicFormRenderer({ category }: DynamicFormRendererProps) {
  // Common mandatory employee fields
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Dynamic answers
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const totalUploadedImages = attachments.length;

  const handleAnswerChange = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        caseType: category.type,
        categorySlug: category.slug,
        employee_number: employeeNumber,
        employee_name: employeeName,
        phone_number: phoneNumber,
        answers,
        uploadedAttachments: attachments.map((a) => ({
          ticketToken: a.ticketToken,
          fieldId: a.fieldId,
          storageKey: a.storageKey,
          filename: a.filename,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
        })),
      };

      const res = await fetch("/api/cases/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "حدث خطأ أثناء إرسال النموذج.");
      }

      setSubmissionResult(data.case);

      // Save non-sensitive reference metadata in browser LocalStorage for quick access
      try {
        const localCases = JSON.parse(localStorage.getItem("es_saved_cases") || "[]");
        const updated = [
          {
            reference: data.case.reference,
            categoryNameAr: data.case.categoryNameAr,
            caseType: data.case.caseType,
            submissionDate: data.case.submissionDate,
          },
          ...localCases.filter((c: any) => c.reference !== data.case.reference),
        ];
        localStorage.setItem("es_saved_cases", JSON.stringify(updated.slice(0, 50)));
      } catch (err) {
        console.warn("LocalStorage save error:", err);
      }
    } catch (err: any) {
      setErrors({ form: err.message || "حدث خطأ غير متوقع." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: "code" | "ref") => {
    navigator.clipboard.writeText(text);
    if (type === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } else {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
    }
  };

  // SUCCESS SCREEN
  if (submissionResult) {
    return (
      <Card className="max-w-2xl mx-auto border-emerald-200 bg-white shadow-md">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <CardTitle className="text-2xl text-emerald-900">
            تم تسجيل {category.type === "request" ? "الطلب" : "الشكوى"} بنجاح
          </CardTitle>
          <CardDescription className="text-slate-600">
            تم استلام بياناتك وسيتم مراجعتها من قبل الإدارة المختصة بقطاع الكباري.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Reference & Tracking Code box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs text-slate-500 font-medium">رقم المعاملة:</span>
                <p className="text-lg font-bold text-slate-900 font-mono">
                  {submissionResult.reference}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(submissionResult.reference, "ref")}
              >
                {copiedRef ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedRef ? "تم النسخ" : "نسخ الرقم"}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium">كود المتابعة السري:</span>
                <p className="text-lg font-bold text-blue-900 font-mono tracking-wider">
                  {submissionResult.trackingCode}
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => copyToClipboard(submissionResult.trackingCode, "code")}
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? "تم نسخ الكود" : "نسخ الكود"}
              </Button>
            </div>
          </div>

          {/* Security Alert */}
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex gap-3 text-amber-900">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">تنبيه أمني هام جداً:</p>
              <p className="leading-relaxed">
                احتفظ بكود المتابعة في مكان آمن، لأنك ستحتاجه عند فتح الطلب من جهاز آخر أو متصفح مختلف.
                تم حفظ هذا الطلب تلقائياً على هذا المتصفح لتسهيل متابعته دون الحاجة لإدخال الكود في كل مرة.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href={`/track/${submissionResult.reference}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-900 text-white font-semibold hover:bg-blue-800 transition-colors shadow-xs"
            >
              الانتقال لصفحة متابعة الطلب
              <ExternalLink className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              العودة للرئيسية
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-sm border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 mb-1">
          <FileText className="w-4 h-4" />
          <span>{category.type === "request" ? "نموذج طلب جديد" : "نموذج شكوى جديدة"}</span>
        </div>
        <CardTitle className="text-2xl text-slate-900">{category.name_ar}</CardTitle>
        {category.description_ar && (
          <CardDescription className="text-slate-600 text-sm mt-1">
            {category.description_ar}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Mandatory Common Employee Fields */}
          <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-900"></span>
              بيانات الموظف الأساسية (إلزامية)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  الرقم الثابت للموظف <span className="text-rose-600">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="مثال: 001234 أو 10582"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  required
                  error={errors.employee_number}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  يتم الاحتفاظ بالأصفار على اليسار
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  الاسم بالكامل <span className="text-rose-600">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="الاسم ثلاثي أو رباعي كما في بطاقة الرقم القومي"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  required
                  error={errors.employee_name}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  رقم الموبايل / واتساب <span className="text-rose-600">*</span>
                </label>
                <Input
                  type="tel"
                  dir="ltr"
                  placeholder="01012345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  error={errors.phone_number}
                />
                <span className="text-[11px] text-slate-400 mt-1 block text-right">
                  رقم موبايل مصري صالح للتواصل والمتابعة
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Category-Specific Dynamic Fields */}
          <div className="space-y-5">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-900"></span>
              تفاصيل وبيانات {category.name_ar}
            </h4>

            {category.field_schema.map((field) => {
              if (field.type === "image") {
                return (
                  <div key={field.id} className="pt-2">
                    <ImageUploader
                      fieldId={field.id}
                      label={field.label_ar}
                      description={field.description_ar}
                      required={field.required}
                      maxImages={field.max_images || 1}
                      totalCurrentImages={totalUploadedImages}
                      maxTotalAllowed={10}
                      attachments={attachments}
                      onAttachmentsChange={setAttachments}
                      error={errors[field.id]}
                    />
                  </div>
                );
              }

              if (field.type === "textarea") {
                return (
                  <div key={field.id}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {field.label_ar} {field.required && <span className="text-rose-600">*</span>}
                    </label>
                    <Textarea
                      placeholder={field.placeholder_ar}
                      value={answers[field.id] || ""}
                      onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                      required={field.required}
                      error={errors[field.id]}
                    />
                  </div>
                );
              }

              if (field.type === "select") {
                return (
                  <div key={field.id}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {field.label_ar} {field.required && <span className="text-rose-600">*</span>}
                    </label>
                    <select
                      className="flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      value={answers[field.id] || ""}
                      onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                      required={field.required}
                    >
                      <option value="">-- اختر من القائمة --</option>
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {errors[field.id] && (
                      <p className="mt-1 text-xs text-rose-600 font-medium">{errors[field.id]}</p>
                    )}
                  </div>
                );
              }

              return (
                <div key={field.id}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {field.label_ar} {field.required && <span className="text-rose-600">*</span>}
                  </label>
                  <Input
                    type={
                      field.type === "number" || field.type === "currency"
                        ? "number"
                        : field.type === "date"
                        ? "date"
                        : "text"
                    }
                    placeholder={field.placeholder_ar}
                    value={answers[field.id] || ""}
                    onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                    required={field.required}
                    error={errors[field.id]}
                  />
                  {field.is_sensitive && (
                    <span className="text-[11px] text-blue-700 mt-1 block">
                      🔒 هذه المعلومة مشفرة ومحمية ولا تظهر إلا للمدير المختص
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Global Image Counter Indicator */}
          <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>إجمالي الصور المرفوعة للطلب:</span>
            </div>
            <span
              className={
                totalUploadedImages > 10 ? "text-rose-600 font-bold" : "text-blue-900 font-bold"
              }
            >
              تم رفع {totalUploadedImages} من 10 صور كحد أقصى
            </span>
          </div>

          {/* Form-level error */}
          {errors.form && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-medium">
              {errors.form}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              className="w-full text-base font-bold shadow-md"
              isLoading={isSubmitting}
            >
              إرسال {category.type === "request" ? "الطلب" : "الشكوى"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
