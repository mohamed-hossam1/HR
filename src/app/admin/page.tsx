import React from "react";
import Image from "next/image";
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
  ArrowLeft,
  Eye,
} from "lucide-react";


interface AdminDashboardPageProps {
  searchParams: Promise<{ dateRange?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    redirect("/admin/login?error=session_expired");
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
    <div className="space-y-6">
      {/* Page Header & Filter Controls */}
      <section className="relative overflow-hidden rounded-xl bg-[#20272d] px-5 py-6 text-white shadow-[0_18px_45px_rgba(32,39,45,0.16)] sm:px-7">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#f9580e]" aria-hidden="true" />
        <div className="absolute -left-16 -top-24 h-52 w-52 rounded-full border-[35px] border-[#f9580e]/8" aria-hidden="true" />
        <div className="relative flex items-start justify-between gap-6">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold tracking-[0.08em] text-[#ff8a52]">
              <span className="h-px w-7 bg-[#f9580e]" aria-hidden="true" />
              نظام خدمات العاملين
            </p>
            <h1 className="text-2xl font-extrabold sm:text-3xl">لوحة متابعة قطاع الكباري</h1>
            <p className="mt-2 text-xs leading-6 text-white/55">
              مرحباً بك، {session.user.name || "مدير خدمات العاملين"} — نظرة عامة على طلبات وشكاوى العاملين
            </p>
          </div>
          <Image
            src="/brand/arab-contractors-logo.png"
            alt="المقاولون العرب"
            width={183}
            height={40}
            priority
            className="hidden h-12 w-auto object-contain md:block"
          />
        </div>

        {/* Date Filters */}
        <div className="relative mt-5 flex max-w-full items-center gap-1.5 overflow-x-auto pb-1">
          {filterOptions.map((opt) => (
            <Link
              key={opt.id}
              href={`/admin?dateRange=${opt.id}`}
              className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                dateRange === opt.id
                  ? "border-[#f9580e] bg-[#f9580e] text-white shadow-[0_5px_16px_rgba(249,88,14,0.2)]"
                  : "border-white/10 bg-white/6 text-white/65 hover:border-white/20 hover:bg-white/10 hover:text-white"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Requests */}
        <Card className="border-[#dedbd4] border-t-[3px] border-t-[#f9580e] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#687078]">إجمالي الطلبات</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#fff0e8] text-[#d94700]">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#20272d]">{stats.totalRequests}</p>
          {stats.unreadRequests > 0 && (
            <span className="mt-2 inline-block rounded-md bg-[#fff0e8] px-2 py-0.5 text-[11px] font-bold text-[#c63f00]">
              {stats.unreadRequests} طلب جديد غير مفتوح
            </span>
          )}
        </Card>

        {/* Total Complaints */}
        <Card className="border-[#dedbd4] border-t-[3px] border-t-[#20272d] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#687078]">إجمالي الشكاوى</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#eef0f1] text-[#20272d]">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#20272d]">{stats.totalComplaints}</p>
          {stats.unreadComplaints > 0 && (
            <span className="mt-2 inline-block rounded-md bg-[#eef0f1] px-2 py-0.5 text-[11px] font-bold text-[#3c464d]">
              {stats.unreadComplaints} شكوى جديدة غير مفتوحة
            </span>
          )}
        </Card>

        {/* Pending */}
        <Card className="border-[#dedbd4] border-t-[3px] border-t-[#c98a2d] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#687078]">في الانتظار</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#fff7e8] text-[#a9680a]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#20272d]">{stats.pending}</p>
          <span className="inline-block mt-2 text-[11px] text-slate-400">بانتظار بدء العمل</span>
        </Card>

        {/* Completed */}
        <Card className="border-[#dedbd4] border-t-[3px] border-t-[#1f8b67] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#687078]">المكتملة بنجاح</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-[#167252]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-[#20272d]">{stats.completed}</p>
          <span className="inline-block mt-2 text-[11px] text-emerald-700 font-semibold">
            تم إصدار الرد أو المستند
          </span>
        </Card>
      </div>

      {/* Secondary Status Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-[#cfd3d5] bg-[#eef0f1]/70 p-4">
          <div>
            <span className="text-xs font-semibold text-[#334149]">قيد التنفيذ والمتابعة</span>
            <p className="mt-1 text-xl font-bold text-[#20272d]">{stats.inProgress}</p>
          </div>
          <span className="text-xs text-[#667078]">جاري معالجتها</span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-[#ead6bb] bg-[#fff8ed] p-4">
          <div>
            <span className="text-xs font-semibold text-[#8c5d21]">بانتظار استكمال بيانات</span>
            <p className="mt-1 text-xl font-bold text-[#6b461a]">{stats.awaitingEmployee}</p>
          </div>
          <span className="text-xs text-[#9a6d35]">بانتظار رد الموظف</span>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-4">
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
      <Card className="border-[#dedbd4] bg-white shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#ebe8e2] px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#20272d]">
            <span className="h-4 w-1 rounded-full bg-[#f9580e]" aria-hidden="true" />
            أحدث المعاملات الواردة
          </CardTitle>
          <Link
            href="/admin/requests"
            className="flex items-center gap-1 text-xs font-bold text-[#c63f00] hover:underline"
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
              <thead className="border-b border-[#dedbd4] bg-[#f4f3f0] font-semibold text-[#586169]">
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
                      className={`transition-colors hover:bg-[#fff8f4] ${
                        c.is_unread ? "bg-[#fff4ee] font-medium" : ""
                      }`}
                    >
                      <td className="flex items-center gap-2 p-3.5 pr-6 font-mono font-bold text-[#20272d]">
                        {c.is_unread && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-[#f9580e]"
                            title="معاملة جديدة غير مفتوحة"
                          />
                        )}
                        <span>{c.reference}</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            c.case_type === "request"
                              ? "bg-[#fff0e8] text-[#c63f00]"
                              : "bg-[#eef0f1] text-[#334149]"
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
                          className="inline-flex items-center gap-1 rounded-lg bg-[#eef0f1] px-3 py-1.5 text-xs font-semibold text-[#334149] transition-colors hover:bg-[#f9580e] hover:text-white"
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
