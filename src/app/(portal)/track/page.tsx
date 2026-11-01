"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Shield, KeyRound, AlertCircle, Info, Lock } from "lucide-react";
import { TrustedCasesList } from "@/components/home/trusted-cases-list";

export default function TrackInquiryPage() {
  const router = useRouter();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/cases/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_number: employeeNumber.trim(),
          tracking_code: trackingCode.trim().toUpperCase(),
          remember_device: rememberDevice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "تعذر العثور على المعاملة.");
      }

      // Add to local storage index for fast access
      try {
        const localCases = JSON.parse(localStorage.getItem("es_saved_cases") || "[]");
        const updated = [
          {
            reference: data.reference,
            categoryNameAr: data.caseDetails.category_name_ar,
            caseType: data.caseDetails.case_type,
            submissionDate: data.caseDetails.submission_date,
          },
          ...localCases.filter((c: any) => c.reference !== data.reference),
        ];
        localStorage.setItem("es_saved_cases", JSON.stringify(updated.slice(0, 50)));
      } catch (err) {
        console.warn("LocalStorage save error:", err);
      }

      // Redirect to case tracking detail page
      router.push(`/track/${data.reference}`);
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-2 sm:py-6 space-y-8">
      <div className="text-center space-y-2">
        <span className="eyebrow">متابعة إلكترونية آمنة</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          استعلام ومتابعة معاملات قطاع الكباري
        </h1>
        <p className="text-sm text-slate-500">
          أدخل الرقم الثابت الخاص بك وكود المتابعة السري للاطلاع على حالة المعاملة والردود الرسمية
        </p>
      </div>

      <Card className="border-[#dedbd4] shadow-lg bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-[#c63f00] text-xs font-semibold">
            <Lock className="w-4 h-4" />
            <span>تسجيل الدخول للمعاملة</span>
          </div>
          <CardTitle className="text-xl text-slate-900">بيانات الاستعلام</CardTitle>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleTrackSubmit} className="space-y-5">
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
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                تأكد من إدخال الأصفار على اليسار إن وجدت
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                كود المتابعة السري <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  dir="ltr"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  className="font-mono text-center tracking-wider text-base"
                  required
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                الكود السري المكون من 16 حرفاً والذي ظهر لك عند تقديم الطلب
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="remember_device"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="w-4 h-4 accent-[#f9580e] rounded-sm border-slate-300 focus:ring-orange-500 cursor-pointer"
              />
              <label
                htmlFor="remember_device"
                className="text-xs text-slate-700 font-medium cursor-pointer"
              >
                تذكر هذا الجهاز لفتح الطلب ومتابعته تلقائياً دون إدخال الكود في المرات القادمة
              </label>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full text-base font-bold shadow-sm"
              isLoading={isLoading}
            >
              <Search className="w-4 h-4 ml-1" />
              استعلام عن المعاملة
            </Button>
          </form>

          {/* Lost Code Information Notice */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex gap-3 bg-slate-50 p-4 rounded-xl text-xs text-slate-600">
            <Info className="w-5 h-5 text-[#c63f00] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-800">هل فقدت كود المتابعة؟</p>
              <p className="leading-relaxed">
                لحماية سرية بياناتك ومستنداتك الشخصية، لا يمكن استرجاع كود المتابعة عبر الرسائل النصية
                أو رقم الهاتف. في حال فقدان الكود وعدم تمكنك من فتح الطلب، يرجى مراجعة الإدارة
                المختصة بالقطاع مباشرة مصطحبًا بطاقة الرقم القومي للتحقق من هويتك وإصدار كود جديد.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previously remembered cases on this browser */}
      <TrustedCasesList />
    </div>
  );
}
