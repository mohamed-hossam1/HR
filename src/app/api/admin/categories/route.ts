import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { categories, case_audit_logs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const fieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const fieldSchema = z.object({
  id: z.string().min(1),
  label_ar: z.string().min(1),
  type: z.enum(["text", "textarea", "number", "currency", "date", "select", "image"]),
  required: z.boolean(),
  description_ar: z.string().optional(),
  placeholder_ar: z.string().optional(),
  options: z.array(fieldOptionSchema).optional(),
  is_sensitive: z.boolean().optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  max_images: z.number().optional(),
  order: z.number(),
});

const createCategorySchema = z.object({
  type: z.enum(["request", "complaint"]),
  name_ar: z.string().min(2, "اسم الفئة مطلوب"),
  description_ar: z.string().optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "الاسم اللاتيني يجب أن يحتوي على حروف صغيرة وأرقام وشرطات فقط"),
  icon: z.string().default("FileText"),
  field_schema: z.array(fieldSchema).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "غير مصرح لك بإنشاء فئات جديدة" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check slug uniqueness
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, data.slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `الاسم التعريفي (slug) "${data.slug}" مستخدم بالفعل، يرجى اختيار اسم آخر.` },
        { status: 400 }
      );
    }

    const [newCat] = await db
      .insert(categories)
      .values({
        type: data.type,
        slug: data.slug,
        name_ar: data.name_ar,
        description_ar: data.description_ar || null,
        icon: data.icon,
        field_schema: data.field_schema,
        form_version: 1,
        is_active: true,
        display_order: 99,
      })
      .returning();

    // Audit log
    await db.insert(case_audit_logs).values({
      action: "CREATE_CATEGORY",
      actor: session.user.email,
      details: { categoryId: newCat.id, slug: newCat.slug, name_ar: newCat.name_ar },
    });

    return NextResponse.json({ success: true, category: newCat });
  } catch (error: any) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: error.message || "فشل إنشاء الفئة الجديدة" },
      { status: 500 }
    );
  }
}
