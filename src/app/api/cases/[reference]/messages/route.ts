import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cases, case_messages, attachments, upload_tickets } from "@/db/schema";
import { isDeviceAuthorizedForCase, DEVICE_COOKIE_NAME } from "@/lib/device-token";
import { auth } from "@/lib/auth";
import { getStorageProvider } from "@/lib/storage";
import { eq } from "drizzle-orm";
import { z } from "zod";

const messagePayloadSchema = z.object({
  messageBody: z.string().trim().min(1, "نص الرسالة مطلوب").max(2000, "الرسالة طويلة جداً"),
  isInternal: z.boolean().default(false),
  senderPortal: z.enum(["admin", "employee"]).optional().default("employee"),
  attachments: z
    .array(
      z.object({
        ticketToken: z.string(),
        storageKey: z.string(),
        filename: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      })
    )
    .optional()
    .default([]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await params;

    const [caseRecord] = await db
      .select()
      .from(cases)
      .where(eq(cases.reference, reference.trim()))
      .limit(1);

    if (!caseRecord) {
      return NextResponse.json({ error: "المعاملة غير موجودة" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = messagePayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات الرسالة غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { messageBody, isInternal, attachments: newAttachments, senderPortal } = parsed.data;

    // Check manager session
    const session = await auth.api.getSession({ headers: req.headers });
    const isManager = Boolean(session);

    let senderType: "employee" | "hr" = "employee";
    let senderName = caseRecord.employee_name;

    if (senderPortal === "admin") {
      if (!isManager) {
        return NextResponse.json(
          { error: "غير مصرح لك بإرسال رد كإدارة موارد بشرية" },
          { status: 401 }
        );
      }
      senderType = "hr";
      senderName = "الموارد البشرية";
    } else {
      // Message submitted from employee portal
      senderType = "employee";
      senderName = caseRecord.employee_name;

      const deviceToken = req.cookies.get(DEVICE_COOKIE_NAME)?.value;
      const isAuthorized = await isDeviceAuthorizedForCase(deviceToken, caseRecord.id);

      if (!isAuthorized && !isManager) {
        return NextResponse.json(
          { error: "غير مصرح لك بإرسال رسائل في هذه المعاملة" },
          { status: 403 }
        );
      }
    }

    // Only HR can write internal notes!
    const effectiveIsInternal = senderType === "hr" ? isInternal : false;

    // Insert message
    const [newMessage] = await db
      .insert(case_messages)
      .values({
        case_id: caseRecord.id,
        sender_type: senderType,
        sender_name: senderName,
        message_body: messageBody,
        is_internal: effectiveIsInternal,
      })
      .returning();

    // Attachments for this message
    const insertedAttachments: any[] = [];
    if (newAttachments && newAttachments.length > 0) {
      const storageProvider = getStorageProvider();

      for (const att of newAttachments) {
        const meta = await storageProvider.verifyUploadedObject(att.storageKey);

        const [newAtt] = await db
          .insert(attachments)
          .values({
            case_id: caseRecord.id,
            message_id: newMessage.id,
            original_filename: att.filename,
            storage_key: att.storageKey,
            file_type: att.mimeType,
            file_size: meta.size || att.fileSize,
            uploader_type: senderType,
            is_verified: meta.exists,
          })
          .returning();

        // Mark ticket used
        await db
          .update(upload_tickets)
          .set({ is_used: true, case_id: caseRecord.id })
          .where(eq(upload_tickets.storage_key, att.storageKey));

        const downloadUrl = await storageProvider.getAuthorizedDownloadUrl(
          att.storageKey,
          att.filename,
          900
        );

        insertedAttachments.push({
          id: newAtt.id,
          messageId: newAtt.message_id,
          filename: newAtt.original_filename,
          fileType: newAtt.file_type,
          fileSize: newAtt.file_size,
          uploaderType: newAtt.uploader_type,
          downloadUrl,
          createdAt: newAtt.created_at,
        });
      }
    }

    // Update case last_updated_at and unread flag if employee replied
    await db
      .update(cases)
      .set({
        last_updated_at: new Date(),
        ...(senderType === "employee" ? { is_unread: true } : {}),
      })
      .where(eq(cases.id, caseRecord.id));

    return NextResponse.json({
      success: true,
      message: newMessage,
      attachments: insertedAttachments,
    });
  } catch (error: any) {
    console.error("Failed to post message:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء إرسال الرسالة." },
      { status: 500 }
    );
  }
}
