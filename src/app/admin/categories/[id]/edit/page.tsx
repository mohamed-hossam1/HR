import React from "react";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FormBuilder } from "@/components/admin/form-builder";
import Link from "next/link";
import { ArrowRight } from "lucide-react";


interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: PageProps) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (!category) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-900 transition-colors"
      >
        <ArrowRight className="w-3.5 h-3.5" />
        <span>العودة لإدارة الفئات</span>
      </Link>

      <FormBuilder
        isNew={false}
        initialData={{
          id: category.id,
          type: category.type as "request" | "complaint",
          slug: category.slug,
          name_ar: category.name_ar,
          description_ar: category.description_ar,
          icon: category.icon,
          is_active: category.is_active,
          display_order: category.display_order,
          field_schema: category.field_schema,
        }}
      />
    </div>
  );
}
