import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardService } from "@/lib/services/dashboard-service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { STATUS_LABELS, formatCairoDate } from "@/lib/validation";
import Link from "next/link";
import {
  FileText,
  AlertOctagon,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowLeft,
  Calendar,
  Eye,
} from "lucide-react";


interface AdminDashboardPageProps {
  searchParams: Promise<{ dateRange?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    redirect("/admin/login");
  }

  const { dateRange = "all" } = await searchParams;

  const { stats, statusBreakdown, topCategories, recentCases } =
    await DashboardService.getSummaryStats({
      dateRange: dateRange as any,
    });

  const filterOptions = [
    { id: "all", label: "كل الأوقات" },
    { id: "today", label: "اليوم" },
    { id: "7d", label: "آخر 7 أيام" },
    { id: "this_month", label: "الشهر الحالي" },
    { id: "last_month", label: "الشهر السابق" },
    { id: "3m", label: "آخر 3 أشهر" },
    { id: "this_year", label: "العام الحالي" },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            لوحة الإحصائيات والمتابعة العامة
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مرحباً بك، {session.user.name || "مدير الموارد البشرية"} — نظرة عامة على الطلبات والشكاوى
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {filterOptions.map((opt) => (
            <Link
              key={opt.id}
              href={`/admin?dateRange=${opt.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                dateRange === opt.id
                  ? "bg-blue-900 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <Card className="border-slate-200 bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي الطلبات</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.totalRequests}</p>
          {stats.unreadRequests > 0 && (
            <span className="inline-block mt-2 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {stats.unreadRequests} طلب جديد غير مفتوح
            </span>
          )}
        </Card>

        {/* Total Complaints */}
        <Card className="border-slate-200 bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي الشكاوى</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-900 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.totalComplaints}</p>
          {stats.unreadComplaints > 0 && (
            <span className="inline-block mt-2 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              {stats.unreadComplaints} شكوى جديدة غير مفتوحة
            </span>
          )}
        </Card>

        {/* Pending */}
        <Card className="border-slate-200 bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">في الانتظار</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.pending}</p>
          <span className="inline-block mt-2 text-[11px] text-slate-400">بانتظار بدء العمل</span>
        </Card>

        {/* Completed */}
        <Card className="border-slate-200 bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">المكتملة بنجاح</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.completed}</p>
          <span className="inline-block mt-2 text-[11px] text-emerald-700 font-semibold">
            تم إصدار الرد أو المستند
          </span>
        </Card>
      </div>

      {/* Secondary Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-900">قيد التنفيذ والمتابعة</span>
            <p className="text-xl font-bold text-blue-950 mt-1">{stats.inProgress}</p>
          </div>
          <span className="text-xs text-blue-700">جاري معالجتها</span>
        </div>

        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-purple-900">بانتظار استكمال بيانات</span>
            <p className="text-xl font-bold text-purple-950 mt-1">{stats.awaitingEmployee}</p>
          </div>
          <span className="text-xs text-purple-700">بانتظار رد الموظف</span>
        </div>

        <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-900">المرفوضة</span>
            <p className="text-xl font-bold text-rose-950 mt-1">{stats.rejected}</p>
          </div>
          <span className="text-xs text-rose-700">مع ذكر سبب الرفض</span>
        </div>
      </div>

      {/* Analytics Visual Charts */}
      <DashboardCharts statusBreakdown={statusBreakdown} topCategories={topCategories} />

      {/* Recent Incoming Cases Table */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="border-b border-slate-100 px-6 py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-900">
            أحدث المعاملات الواردة
          </CardTitle>
          <Link
            href="/admin/requests"
            className="text-xs font-bold text-blue-900 hover:underline flex items-center gap-1"
          >
            <span>عرض كل الطلبات</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {recentCases.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400">
              لا توجد أي معاملات مسجلة في قاعدة البيانات حالياً.
            </p>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3.5 pr-6">رقم المعاملة</th>
                  <th className="p-3.5">النوع</th>
                  <th className="p-3.5">الخدمة</th>
                  <th className="p-3.5">اسم الموظف</th>
                  <th className="p-3.5">الرقم الثابت</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">تاريخ التقديم</th>
                  <th className="p-3.5 pl-6 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCases.map((c) => {
                  const statusInfo = STATUS_LABELS[c.status] || {
                    label: c.status,
                    color: "text-slate-700",
                    bg: "bg-slate-100",
                  };
                  const detailHref =
                    c.case_type === "request"
                      ? `/admin/requests/${c.id}`
                      : `/admin/complaints/${c.id}`;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        c.is_unread ? "bg-blue-50/30 font-medium" : ""
                      }`}
                    >
                      <td className="p-3.5 pr-6 font-mono font-bold text-blue-950 flex items-center gap-2">
                        {c.is_unread && (
                          <span
                            className="w-2 h-2 rounded-full bg-blue-600 shrink-0"
                            title="معاملة جديدة غير مفتوحة"
                          />
                        )}
                        <span>{c.reference}</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            c.case_type === "request"
                              ? "bg-blue-50 text-blue-800"
                              : "bg-purple-50 text-purple-800"
                          }`}
                        >
                          {c.case_type === "request" ? "طلب" : "شكوى"}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-800">{c.category_name_ar}</td>
                      <td className="p-3.5 text-slate-700">{c.employee_name}</td>
                      <td className="p-3.5 font-mono text-slate-600">{c.employee_number}</td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">{formatCairoDate(c.submission_date)}</td>
                      <td className="p-3.5 pl-6 text-center">
                        <Link
                          href={detailHref}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-blue-900 hover:text-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>فتح المعاملة</span>
                        </Link>
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
