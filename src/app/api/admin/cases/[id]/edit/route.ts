import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cases, case_audit_logs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const editSchema = z.object({
  employee_name: z.string().trim().min(2),
  phone_number: z.string().trim().min(10),
  profession: z.string().optional().nullable(),
  answers: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().min(1, "سبب التعديل مطلوب لسجل التدقيق"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "غير مصرح لك بتعديل بيانات المعاملة" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = editSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { employee_name, phone_number, profession, answers, reason } = parsed.data;

    const [oldCase] = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
    if (!oldCase) {
      return NextResponse.json({ error: "المعاملة غير موجودة" }, { status: 404 });
    }

    const oldValues = {
      employee_name: oldCase.employee_name,
      phone_number: oldCase.phone_number,
      profession: oldCase.profession,
      answers: oldCase.answers,
    };

    const newAnswers = answers ? { ...oldCase.answers, ...answers } : oldCase.answers;

    await db
      .update(cases)
      .set({
        employee_name,
        phone_number,
        profession: profession || null,
        answers: newAnswers,
        last_updated_at: new Date(),
      })
      .where(eq(cases.id, id));

    // Record audit log
    await db.insert(case_audit_logs).values({
      case_id: id,
      action: "EDIT_CASE_DATA",
      actor: session.user.email,
      details: {
        reason,
        before: oldValues,
        after: {
          employee_name,
          phone_number,
          profession,
          answers: newAnswers,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Case edit failed:", error);
    return NextResponse.json(
      { error: error.message || "فشل تعديل بيانات المعاملة" },
      { status: 500 }
    );
  }
}
