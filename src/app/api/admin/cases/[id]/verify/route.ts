import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cases, case_audit_logs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const verifySchema = z.object({
  verified: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "غير مصرح لك بتعديل التحقق" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const { verified } = parsed.data;

    await db
      .update(cases)
      .set({ is_identity_verified: verified, last_updated_at: new Date() })
      .where(eq(cases.id, id));

    await db.insert(case_audit_logs).values({
      case_id: id,
      action: verified ? "VERIFY_IDENTITY" : "UNVERIFY_IDENTITY",
      actor: session.user.email,
      details: { verified },
    });

    return NextResponse.json({ success: true, is_identity_verified: verified });
  } catch (error: any) {
    console.error("Verification toggle failed:", error);
    return NextResponse.json(
      { error: error.message || "فشل تعديل حالة التحقق" },
      { status: 500 }
    );
  }
}
