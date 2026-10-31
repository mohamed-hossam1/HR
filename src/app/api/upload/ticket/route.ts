import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/db";
import { upload_tickets } from "@/db/schema";
import { getStorageProvider } from "@/lib/storage";
import { auth } from "@/lib/auth";

const EMPLOYEE_ALLOWED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const HR_ALLOWED_MIMES = [
  ...EMPLOYEE_ALLOWED_MIMES,
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
];

const ticketRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024, "حجم الملف يتجاوز 5 ميجابايت"),
  caseId: z.string().uuid().optional(),
  uploaderType: z.enum(["employee", "hr"]).default("employee"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ticketRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { filename, mimeType, fileSize, caseId, uploaderType } = parsed.data;

    // Check permissions if HR upload
    if (uploaderType === "hr") {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) {
        return NextResponse.json(
          { error: "غير مصرح لك برفع مستندات الموارد البشرية" },
          { status: 401 }
        );
      }
      if (!HR_ALLOWED_MIMES.includes(mimeType.toLowerCase())) {
        return NextResponse.json(
          { error: "نوع الملف غير مسموح به لملفات الموارد البشرية (يسمح فقط بـ PDF, Word, Excel, صور)" },
          { status: 400 }
        );
      }
    } else {
      // Employee upload
      if (!EMPLOYEE_ALLOWED_MIMES.includes(mimeType.toLowerCase())) {
        return NextResponse.json(
          { error: "صيغة الملف غير مدعومة للموظفين. يسمح فقط بالصور من نوع (JPG, PNG, WebP)" },
          { status: 400 }
        );
      }
    }

    // Generate safe storage key
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const safeBaseName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const randomPrefix = crypto.randomUUID();
    const storageKey = `cases/${year}/${month}/${randomPrefix}-${safeBaseName}`;

    // Get Storage Provider and create PUT authorization
    const storageProvider = getStorageProvider();
    const authResult = await storageProvider.createUploadAuthorization({
      key: storageKey,
      contentType: mimeType,
      contentLength: fileSize,
      expiresInSeconds: 900, // 15 minutes
    });

    // Save ticket in database
    const ticketToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.insert(upload_tickets).values({
      ticket_token: ticketToken,
      case_id: caseId || null,
      storage_key: storageKey,
      expected_mime: mimeType,
      max_size: fileSize,
      expires_at: expiresAt,
      is_used: false,
    });

    return NextResponse.json({
      ticketToken,
      uploadUrl: authResult.uploadUrl,
      method: authResult.method,
      headers: authResult.headers,
      storageKey,
    });
  } catch (error: any) {
    console.error("Upload ticket creation failed:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء إصدار تصريح الرفع" },
      { status: 500 }
    );
  }
}
