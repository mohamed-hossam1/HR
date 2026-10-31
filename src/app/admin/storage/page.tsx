import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cases, attachments, categories } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getStorageProvider } from "@/lib/storage";
import { formatBytesArabic } from "@/lib/validation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HardDrive, AlertTriangle, ShieldCheck, Database, Layers, Info } from "lucide-react";


export default async function AdminStoragePage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    redirect("/admin/login");
  }

  const storageProvider = getStorageProvider();
  const usage = await storageProvider.getStorageUsage();

  // Total Cases count
  const [casesCount] = await db
    .select({ count: sql<number>`COUNT(*)::integer` })
    .from(cases);

  // Storage breakdown by category
  const categoryBreakdown = await db
    .select({
      categoryName: cases.category_name_ar,
      caseType: cases.case_type,
      totalBytes: sql<number>`COALESCE(SUM(attachments.file_size), 0)::bigint`,
      fileCount: sql<number>`COUNT(attachments.id)::integer`,
    })
    .from(cases)
    .leftJoin(attachments, sql`attachments.case_id = cases.id`)
    .groupBy(cases.category_name_ar, cases.case_type)
    .orderBy(sql`SUM(attachments.file_size) DESC NULLS LAST`);

  const softLimitBytes = usage.softLimitMb * 1024 * 1024;
  const isB2 = Boolean(
    process.env.B2_ENDPOINT &&
    process.env.B2_APPLICATION_KEY &&
    process.env.B2_BUCKET_NAME
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
          <HardDrive className="w-6 h-6 text-blue-900" />
          <span>مساحة التخزين السحابي (Backblaze B2)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          مراقبة تقديرية لاستهلاك المرفقات والمستندات المخزنة وحماية السعة المجانية
        </p>
      </div>

      {/* Warning Alert if usage is high */}
      {usage.warningLevel !== "normal" && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 ${
            usage.warningLevel === "exceeded"
              ? "bg-rose-50 border-rose-300 text-rose-900"
              : usage.warningLevel === "critical_95"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">
              {usage.warningLevel === "exceeded"
                ? "تنبيه: تم تجاوز السقف المحدد للتخزين!"
                : "تنبيه: اقتراب استهلاك التخزين من الحد المسموح"}
            </p>
            <p className="font-normal mt-0.5">
              نسبة الاستهلاك الحالية بلغت {usage.usagePercentage}%. يرجى مراجعة الملفات القديمة أو
              توسيع السعة التخزينية في لوحة تحكم مزود الخدمة.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200 bg-white shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">حجم التخزين الفعلي المستهلك</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {formatBytesArabic(usage.totalBytes)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            من إجمالي سقف {usage.softLimitMb} ميجابايت
          </span>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">إجمالي المرفقات المخزنة</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{usage.objectCount}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">ملف وصورة ومستند رسمي</span>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">إجمالي المعاملات المسجلة</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {casesCount?.count || 0}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">طلب وشكوى في قاعدة البيانات</span>
        </Card>

        <Card className="p-5 border-slate-200 bg-white shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">نوع مزود التخزين النشط</span>
          <p className="text-lg font-bold text-blue-900 mt-2">
            {isB2 ? "Backblaze B2 (سحابي)" : "Local Storage (محلي)"}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {isB2 ? "حاوية خاصة مشفرة S3" : "بيئة التطوير والاختبار"}
          </span>
        </Card>
      </div>

      {/* Storage Progress Bar */}
      <Card className="border-slate-200 bg-white shadow-xs p-6 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span>مؤشر السعة الاستيعابية التقديرية:</span>
          <span>{usage.usagePercentage}% مستخدمة</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              usage.usagePercentage >= 95
                ? "bg-rose-600"
                : usage.usagePercentage >= 85
                ? "bg-amber-500"
                : "bg-blue-900"
            }`}
            style={{ width: `${Math.min(100, usage.usagePercentage)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>0 ميجابايت</span>
          <span>الحد التحذيري: 70%</span>
          <span>السقف المخصص: {usage.softLimitMb} ميجابايت</span>
        </div>
      </Card>

      {/* Breakdown by Category */}
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 px-6 py-4">
          <CardTitle className="text-sm font-bold text-slate-900">
            توزيع استهلاك التخزين حسب نوع الخدمة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5 pr-6">اسم الخدمة</th>
                <th className="p-3.5">النوع</th>
                <th className="p-3.5">عدد المرفقات</th>
                <th className="p-3.5 pl-6">الحجم الإجمالي المستهلك</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryBreakdown.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 pr-6 font-bold text-slate-800">{row.categoryName}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        row.caseType === "request"
                          ? "bg-blue-50 text-blue-800"
                          : "bg-purple-50 text-purple-800"
                      }`}
                    >
                      {row.caseType === "request" ? "طلب" : "شكوى"}
                    </span>
                  </td>
                  <td className="p-3.5 font-medium text-slate-700">{row.fileCount} ملف</td>
                  <td className="p-3.5 pl-6 font-mono font-bold text-slate-900">
                    {formatBytesArabic(Number(row.totalBytes || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Provider Disclaimer Notice */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-3 text-xs text-slate-600">
        <Info className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-800">إخلاء مسؤولية حول الإحصاءات التقديرية:</p>
          <p className="leading-relaxed">
            جميع الأرقام المعروضة في هذه الصفحة هي إحصاءات تقديرية محسوبة على مستوى التطبيق وقاعدة
            البيانات. قد تختلف الأرقام الدقيقة لدى مزود الخدمة (Backblaze B2) بسبب الإصدارات السابقة
            للملفات (versioning) أو الرؤوس الإضافية. يمكنك مراجعة لوحة تحكم حساب Backblaze B2 مباشرة
            للاطلاع على إحصائيات الفواتير والحصص الرسمية.
          </p>
        </div>
      </div>
    </div>
  );
}
