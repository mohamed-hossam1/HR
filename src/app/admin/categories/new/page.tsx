import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { FormBuilder } from "@/components/admin/form-builder";
import Link from "next/link";
import { ArrowRight } from "lucide-react";


export default async function NewCategoryPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    redirect("/admin/login");
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

      <FormBuilder isNew={true} />
    </div>
  );
}
