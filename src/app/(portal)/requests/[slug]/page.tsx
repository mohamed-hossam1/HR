import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DynamicFormRenderer } from "@/components/forms/dynamic-form-renderer";
import Link from "next/link";
import { ArrowRight } from "lucide-react";


interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function RequestCategoryPage({ params }: PageProps) {
  const { slug } = await params;

  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.slug, slug),
        eq(categories.type, "request"),
        eq(categories.is_active, true)
      )
    )
    .limit(1);

  if (!category) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <Link
        href="/requests"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-900 transition-colors"
      >
        <ArrowRight className="w-3.5 h-3.5" />
        <span>العودة لدليل الطلبات</span>
      </Link>

      <DynamicFormRenderer
        category={{
          id: category.id,
          slug: category.slug,
          type: "request",
          name_ar: category.name_ar,
          description_ar: category.description_ar,
          field_schema: category.field_schema,
        }}
      />
    </div>
  );
}
