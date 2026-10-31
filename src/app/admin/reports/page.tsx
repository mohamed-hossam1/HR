import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { categories, cases } from "@/db/schema";
import { sql } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileDown, Calendar, Filter, ShieldCheck } from "lucide-react";


export default async function AdminReportsPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    redirect("/admin/login");
  }

  const allCategories = await db.select().from(categories).orderBy(categories.name_ar);

  // Historical counts by month
  const monthlyStats = await db.execute<{
    month_label: string;
    req_count: number;
    cmp_count: number;
  }>(sql`
    SELECT
      to_char(submission_date, 'YYYY-MM') AS month_label,
      COUNT(*) FILTER (WHERE case_type = 'request')::integer AS req_count,
      COUNT(*) FILTER (WHERE case_type = 'complaint')::integer AS cmp_count
    FROM cases
    GROUP BY to_char(submission_date, 'YYYY-MM')
    ORDER BY month_label DESC
    LIMIT 12;
  `);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
          <FileSpreadsheet className="w-6 h-6 text-emerald-800" />
          <span>التقارير وتصدير جداول Excel</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          تصدير سجلات الطلبات والشكاوى إلى ملفات إكسل رسمية (.xlsx) مع معالجة حماية الصيغ الحسابية
        </p>
      </div>

      {/* Export Tool Card */}
      <Card className="border-emerald-200 bg-white shadow-xs p-6 space-y-5">
        <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm border-b border-slate-100 pb-3">
          <FileDown className="w-5 h-5 text-emerald-700" />
          <span>توليد وتنزيل تقرير إكسل فوري</span>
        </div>

        <form action="/api/admin/export" method="GET" className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">نوع المعاملة:</label>
            <select
              name="caseType"
              className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">جميع المعاملات (طلبات وشكاوى)</option>
              <option value="request">الطلبات فقط</option>
              <option value="complaint">الشكاوى والتظلمات فقط</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">الخدمة / الفئة:</label>
            <select
              name="categoryId"
              className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">جميع الفئات</option>
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar} ({c.type === "request" ? "طلب" : "شكوى"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">حالة المعاملة:</label>
            <select
              name="status"
              className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">جميع الحالات</option>
              <option value="pending">في الانتظار</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="awaiting_employee">بانتظار استكمال بيانات</option>
              <option value="completed">مكتمل</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              size="lg"
              className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
            >
              <FileDown className="w-4 h-4 ml-1.5" />
              تنزيل ملف Excel (.xlsx)
            </Button>
          </div>
        </form>

        <div className="pt-2 text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            يتم استبعاد أرقام بطاقات الرقم القومي وأكواد المتابعة السرية وروابط الملفات الخاصة تلقائياً
            من ملفات الإكسل لحماية خصوصية وسرية العاملين.
          </span>
        </div>
      </Card>

      {/* Historical Monthly Summary Table */}
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 px-6 py-4">
          <CardTitle className="text-sm font-bold text-slate-900">
            السجل التاريخي للوارد شهرياً
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {monthlyStats.rows.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400">
              لا توجد بيانات شهرية كافية مسجلة بعد.
            </p>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3.5 pr-6">الشهر</th>
                  <th className="p-3.5 text-center">الطلبات المسجلة</th>
                  <th className="p-3.5 text-center">الشكاوى المسجلة</th>
                  <th className="p-3.5 pl-6 text-center">الإجمالي الشهري</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyStats.rows.map((row, idx) => {
                  const req = Number(row.req_count || 0);
                  const cmp = Number(row.cmp_count || 0);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pr-6 font-mono font-bold text-slate-900">
                        {row.month_label}
                      </td>
                      <td className="p-3.5 text-center font-bold text-blue-900">{req}</td>
                      <td className="p-3.5 text-center font-bold text-purple-900">{cmp}</td>
                      <td className="p-3.5 pl-6 text-center font-extrabold text-slate-900">
                        {req + cmp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
