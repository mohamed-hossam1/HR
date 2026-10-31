import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cases, case_status_history, case_audit_logs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const statusUpdateSchema = z.object({
  newStatus: z.enum([
    "pending",
    "in_progress",
    "awaiting_employee",
    "completed",
    "rejected",
  ]),
  note: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "غير مصرح لك بتغيير الحالة" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = statusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { newStatus, note } = parsed.data;

    const [caseRecord] = await db.select().from(cases).where(eq(cases.id, id)).limit(1);

    if (!caseRecord) {
      return NextResponse.json({ error: "المعاملة غير موجودة" }, { status: 404 });
    }

    const previousStatus = caseRecord.status;
    const isCompleted = newStatus === "completed";

    // Update case status
    await db
      .update(cases)
      .set({
        status: newStatus,
        last_updated_at: new Date(),
        ...(isCompleted ? { completion_date: new Date() } : {}),
      })
      .where(eq(cases.id, id));

    // Record status history
    await db.insert(case_status_history).values({
      case_id: id,
      previous_status: previousStatus,
      new_status: newStatus,
      actor: session.user.name || "مدير الموارد البشرية",
      note: note || `تم تغيير الحالة من "${previousStatus}" إلى "${newStatus}"`,
    });

    // Record audit log
    await db.insert(case_audit_logs).values({
      case_id: id,
      action: "STATUS_CHANGE",
      actor: session.user.email,
      details: {
        previousStatus,
        newStatus,
        note,
      },
    });

    return NextResponse.json({ success: true, newStatus });
  } catch (error: any) {
    console.error("Status update failed:", error);
    return NextResponse.json(
      { error: error.message || "فشل تغيير حالة المعاملة" },
      { status: 500 }
    );
  }
}
