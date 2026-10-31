import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { categories, case_audit_logs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateCategorySchema = z.object({
  name_ar: z.string().min(2),
  description_ar: z.string().optional().nullable(),
  icon: z.string().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional(),
  field_schema: z.array(z.any()).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "غير مصرح لك بتعديل الفئات" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "الفئة غير موجودة" }, { status: 404 });
    }

    const nextVersion = existing.form_version + 1;

    const [updated] = await db
      .update(categories)
      .set({
        name_ar: parsed.data.name_ar,
        description_ar: parsed.data.description_ar || null,
        icon: parsed.data.icon || existing.icon,
        is_active: parsed.data.is_active !== undefined ? parsed.data.is_active : existing.is_active,
        display_order:
          parsed.data.display_order !== undefined
            ? parsed.data.display_order
            : existing.display_order,
        field_schema: parsed.data.field_schema || existing.field_schema,
        form_version: nextVersion,
        updated_at: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    // Audit log
    await db.insert(case_audit_logs).values({
      action: "UPDATE_CATEGORY",
      actor: session.user.email,
      details: {
        categoryId: id,
        previousVersion: existing.form_version,
        newVersion: nextVersion,
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { error: error.message || "فشل تعديل الفئة" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const [updated] = await db
      .update(categories)
      .set({
        is_active: Boolean(body.is_active),
        updated_at: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
