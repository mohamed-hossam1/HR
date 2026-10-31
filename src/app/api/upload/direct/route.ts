import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { upload_tickets } from "@/db/schema";
import { getStorageProvider } from "@/lib/storage";
import { eq, and, gt } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const ticketToken = formData.get("ticketToken") as string | null;
    const storageKey = formData.get("storageKey") as string | null;

    if (!file || !ticketToken || !storageKey) {
      return NextResponse.json(
        { error: "البيانات غير مكتملة (الملف، التذكرة، ومفتاح التخزين مطلوبة)" },
        { status: 400 }
      );
    }

    // Verify upload ticket
    const [ticket] = await db
      .select()
      .from(upload_tickets)
      .where(
        and(
          eq(upload_tickets.ticket_token, ticketToken),
          eq(upload_tickets.storage_key, storageKey),
          gt(upload_tickets.expires_at, new Date())
        )
      )
      .limit(1);

    if (!ticket) {
      return NextResponse.json(
        { error: "تصريح الرفع غير صالح أو منتهي الصلاحية" },
        { status: 403 }
      );
    }

    // Upload directly using storage provider (B2 or Local)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storageProvider = getStorageProvider();

    await storageProvider.uploadDirect(
      storageKey,
      buffer,
      file.type || ticket.expected_mime || "application/octet-stream"
    );

    return NextResponse.json({
      success: true,
      storageKey,
      fileSize: buffer.length,
    });
  } catch (error: any) {
    console.error("Direct upload fallback error:", error);
    return NextResponse.json(
      { error: error.message || "فشل رفع الملف إلى التخزين" },
      { status: 500 }
    );
  }
}
