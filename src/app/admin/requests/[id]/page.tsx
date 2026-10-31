import React from "react";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cases, case_audit_logs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { CaseService } from "@/lib/services/case-service";
import { AdminCaseDetail } from "@/components/admin/admin-case-detail";


interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminRequestDetailPage({ params }: PageProps) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;

  const [caseRecord] = await db
    .select()
    .from(cases)
    .where(eq(cases.id, id))
    .limit(1);

  if (!caseRecord || caseRecord.case_type !== "request") {
    notFound();
  }

  // Mark as opened/read if first open
  if (caseRecord.is_unread || !caseRecord.first_opened_at) {
    await db
      .update(cases)
      .set({
        is_unread: false,
        first_opened_at: caseRecord.first_opened_at || new Date(),
      })
      .where(eq(cases.id, id));
  }

  // Fetch audit logs
  const auditLogs = await db
    .select()
    .from(case_audit_logs)
    .where(eq(case_audit_logs.case_id, id))
    .orderBy(desc(case_audit_logs.created_at));

  // Build manager view with decrypted sensitive values
  const caseData = await CaseService.buildAuthorizedCaseView(caseRecord, true);

  return <AdminCaseDetail initialCase={caseData} auditLogs={auditLogs} />;
}
