import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  Plus,
  Edit3,
  Layers,
  CheckCircle,
  XCircle,
  FileText,
  AlertOctagon,
} from "lucide-react";


export default async function AdminCategoriesPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    redirect("/admin/login");
  }

  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.type), asc(categories.display_order));

  const requests = allCategories.filter((c) => c.type === "request");
  const complaints = allCategories.filter((c) => c.type === "complaint");

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-blue-900" />
            <span>إدارة أنواع الطلبات والشكاوى (منشئ النماذج)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            يمكنك إنشاء وتعديل حقول النماذج ديناميكياً دون الحاجة لتعديل الكود البرمجي
          </p>
        </div>

        <Link
          href="/admin/categories/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-900 text-white hover:bg-blue-800 text-xs font-bold transition-colors shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء فئة جديدة</span>
        </Link>
      </div>

      {/* Section 1: Requests */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-900" />
          <h2 className="text-lg font-bold text-slate-900">أنواع الطلبات المتاحة</h2>
          <span className="text-xs text-slate-400 font-semibold">({requests.length})</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((cat) => (
            <Card key={cat.id} className="border-slate-200 bg-white shadow-xs p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900">{cat.name_ar}</h3>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      cat.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {cat.is_active ? "مفعلة وتظهر للعاملين" : "معطلة"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {cat.description_ar || "لا يوجد وصف مختصر"}
                </p>
                <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
                  <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    slug: {cat.slug}
                  </span>
                  <span>{cat.field_schema.length} حقول مخصصة</span>
                  <span>إصدار {cat.form_version}</span>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  الترتيب: {cat.display_order}
                </span>
                <Link
                  href={`/admin/categories/${cat.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-900 hover:text-white transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل الحقول والنموذج</span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Section 2: Complaints */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-purple-900" />
          <h2 className="text-lg font-bold text-slate-900">أنواع الشكاوى والتظلمات</h2>
          <span className="text-xs text-slate-400 font-semibold">({complaints.length})</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {complaints.map((cat) => (
            <Card key={cat.id} className="border-slate-200 bg-white shadow-xs p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900">{cat.name_ar}</h3>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      cat.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {cat.is_active ? "مفعلة وتظهر للعاملين" : "معطلة"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {cat.description_ar || "لا يوجد وصف مختصر"}
                </p>
                <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
                  <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    slug: {cat.slug}
                  </span>
                  <span>{cat.field_schema.length} حقول مخصصة</span>
                  <span>إصدار {cat.form_version}</span>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  الترتيب: {cat.display_order}
                </span>
                <Link
                  href={`/admin/categories/${cat.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-purple-900 hover:text-white transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل الحقول والنموذج</span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
