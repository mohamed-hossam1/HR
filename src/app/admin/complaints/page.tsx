import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CaseQueryService } from "@/lib/services/case-query-service";
import { STATUS_LABELS, formatCairoDate } from "@/lib/validation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertOctagon,
  Search,
  Filter,
  FileDown,
  Eye,
  Paperclip,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";


interface ComplaintsPageProps {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminComplaintsPage({ searchParams }: ComplaintsPageProps) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const categoryId = params.categoryId || "";
  const status = params.status || "";

  const complaintCategories = await db
    .select({ id: categories.id, name_ar: categories.name_ar })
    .from(categories)
    .where(eq(categories.type, "complaint"))
    .orderBy(categories.display_order);

  const { cases: caseList, totalCount, totalPages, currentPage } =
    await CaseQueryService.queryCases({
      caseType: "complaint",
      search,
      categoryId: categoryId || undefined,
      status: status || undefined,
      page,
      pageSize: 15,
    });

  const exportUrl = `/api/admin/export?caseType=complaint${
    search ? `&search=${encodeURIComponent(search)}` : ""
  }${categoryId ? `&categoryId=${categoryId}` : ""}${status ? `&status=${status}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <AlertOctagon className="w-6 h-6 text-purple-900" />
            <span>إدارة الشكاوى والتظلمات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إجمالي الشكاوى المطابقة للبحث:{" "}
            <span className="font-bold text-slate-800">{totalCount} شكوى</span>
          </p>
        </div>

        <a
          href={exportUrl}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold transition-colors shadow-xs self-start sm:self-auto"
        >
          <FileDown className="w-4 h-4" />
          <span>تصدير Excel للشكاوى</span>
        </a>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 bg-white shadow-xs p-4">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="sm:col-span-1">
            <div className="relative">
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="بحث برقم الشكوى، الاسم، الرقم الثابت..."
                className="w-full h-10 pr-3 pl-8 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              name="categoryId"
              defaultValue={categoryId}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none bg-white"
            >
              <option value="">كل أنواع الشكاوى</option>
              {complaintCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              name="status"
              defaultValue={status}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none bg-white"
            >
              <option value="">كل الحالات</option>
              <option value="pending">في الانتظار</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="awaiting_employee">بانتظار استكمال بيانات</option>
              <option value="completed">مكتمل</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              className="h-10 flex-1 text-xs font-bold bg-purple-900 hover:bg-purple-800"
            >
              <Filter className="w-3.5 h-3.5 ml-1" />
              تطبيق التصفية
            </Button>
            {(search || categoryId || status) && (
              <Link
                href="/admin/complaints"
                className="h-10 px-3 rounded-xl border border-slate-300 flex items-center justify-center text-xs text-slate-600 hover:bg-slate-50 font-medium"
              >
                إلغاء
              </Link>
            )}
          </div>
        </form>
      </Card>

      {/* Table */}
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {caseList.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <p className="text-base font-semibold text-slate-600">لا توجد شكاوى مطابقة</p>
              <p>جرب تغيير معايير البحث أو التصفية الحالية</p>
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-3.5 pr-6">رقم الشكوى</th>
                  <th className="p-3.5">النوع</th>
                  <th className="p-3.5">اسم الموظف</th>
                  <th className="p-3.5">الرقم الثابت</th>
                  <th className="p-3.5">الموبايل</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">تاريخ التقديم</th>
                  <th className="p-3.5 text-center">المرفقات</th>
                  <th className="p-3.5 pl-6 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {caseList.map((c) => {
                  const statusInfo = STATUS_LABELS[c.status] || {
                    label: c.status,
                    color: "text-slate-700",
                    bg: "bg-slate-100",
                  };

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        c.is_unread ? "bg-purple-50/20 font-semibold" : ""
                      }`}
                    >
                      <td className="p-3.5 pr-6 font-mono font-bold text-purple-950 flex items-center gap-2">
                        {c.is_unread && (
                          <span
                            className="w-2 h-2 rounded-full bg-purple-600 shrink-0"
                            title="شكوى جديدة غير مفتوحة"
                          />
                        )}
                        <span>{c.reference}</span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-800">{c.category_name_ar}</td>
                      <td className="p-3.5 text-slate-700">{c.employee_name}</td>
                      <td className="p-3.5 font-mono text-slate-600">{c.employee_number}</td>
                      <td className="p-3.5 font-mono text-slate-600" dir="ltr">
                        {c.phone_number}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">{formatCairoDate(c.submission_date)}</td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{c.attachmentCount}</span>
                        </span>
                      </td>
                      <td className="p-3.5 pl-6 text-center">
                        <Link
                          href={`/admin/complaints/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-purple-900 hover:text-white transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>فتح الشكوى</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              صفحة {currentPage} من {totalPages}
            </span>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/complaints?page=${currentPage - 1}${
                    search ? `&search=${search}` : ""
                  }${categoryId ? `&categoryId=${categoryId}` : ""}${
                    status ? `&status=${status}` : ""
                  }`}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 flex items-center gap-1 font-semibold"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  href={`/admin/complaints?page=${currentPage + 1}${
                    search ? `&search=${search}` : ""
                  }${categoryId ? `&categoryId=${categoryId}` : ""}${
                    status ? `&status=${status}` : ""
                  }`}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 flex items-center gap-1 font-semibold"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
