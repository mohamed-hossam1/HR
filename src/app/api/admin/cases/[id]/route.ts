import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cases, case_audit_logs, upload_tickets } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json(
        { error: "غير مصرح لك بالوصول. يرجى تسجيل الدخول كمدير نظام." },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "معرف المعاملة مطلوب" },
        { status: 400 }
      );
    }

    // Find the case by UUID id or by reference code (e.g. REQ-2026-000001)
    const [existingCase] = await db
      .select()
      .from(cases)
      .where(or(eq(cases.id, id), eq(cases.reference, id)))
      .limit(1);

    if (!existingCase) {
      return NextResponse.json(
        { error: "المعاملة غير موجودة أو تم حذفها بالفعل" },
        { status: 404 }
      );
    }

    // Clean up any upload tickets for this case
    try {
      await db
        .delete(upload_tickets)
        .where(eq(upload_tickets.case_id, existingCase.id));
    } catch (e) {
      console.warn("Failed to clean up upload tickets:", e);
    }

    // Log the deletion in audit logs before removing the case record
    await db.insert(case_audit_logs).values({
      case_id: existingCase.id,
      action: "DELETE_CASE",
      actor: session.user.email || session.user.name || "admin",
      details: {
        caseId: existingCase.id,
        reference: existingCase.reference,
        caseType: existingCase.case_type,
        categoryNameAr: existingCase.category_name_ar,
        employeeNumber: existingCase.employee_number,
        employeeName: existingCase.employee_name,
        submissionDate: existingCase.submission_date,
      },
    });

    // Delete the case from the database.
    // Cascading foreign keys will automatically delete:
    // - attachments
    // - case_messages
    // - case_sensitive_data
    // - case_status_history
    // - trusted_device_cases
    await db.delete(cases).where(eq(cases.id, existingCase.id));

    return NextResponse.json({
      success: true,
      message: `تم حذف ${existingCase.case_type === "request" ? "الطلب" : "الشكوى"} (${existingCase.reference}) بنجاح`,
      reference: existingCase.reference,
    });
  } catch (error: any) {
    console.error("Failed to delete case:", error);
    return NextResponse.json(
      { error: error.message || "فشل حذف المعاملة من النظام" },
      { status: 500 }
    );
  }
}
