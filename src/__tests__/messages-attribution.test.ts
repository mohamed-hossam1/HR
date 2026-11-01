import { describe, it, expect, beforeAll } from "vitest";
import { CaseService } from "@/lib/services/case-service";
import { POST as messagesPost } from "@/app/api/cases/[reference]/messages/route";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { cases, case_messages, attachments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

describe("Message Sender Attribution and HR Attachments", () => {
  let testCaseRef: string;
  let testCaseId: string;
  let adminSessionHeaders: Headers;

  beforeAll(async () => {
    // 1. Submit a test case as employee
    const res = await CaseService.submitCase({
      caseType: "request",
      categorySlug: "salary-certificate",
      employee_number: "009988",
      employee_name: "سامح عبد العزيز",
      phone_number: "01012345678",
      profession: "محاسب مالي",
      answers: {
        profession: "محاسب مالي",
        project_name: "مشروع العاصمة",
        purpose: "فتح حساب بنكي",
        bank_name: "بنك مصر",
      },
      uploadedAttachments: [],
    });

    testCaseRef = res.reference;
    testCaseId = res.caseId;

    // 2. Authenticate admin
    const authRes = await auth.api.signInUsername({
      body: {
        username: env.ADMIN_INITIAL_USERNAME,
        password: env.ADMIN_INITIAL_PASSWORD,
      },
      asResponse: true,
    });
    const setCookie = authRes.headers.get("set-cookie") || "";
    adminSessionHeaders = new Headers();
    adminSessionHeaders.set("cookie", setCookie);
  }, 30000);

  it("attributes message to employee when senderPortal is employee even if admin session cookie is sent", async () => {
    // Simulate browser where admin was logged in, but user submits from tracking page
    const req = new NextRequest(`http://localhost:3000/api/cases/${testCaseRef}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: adminSessionHeaders.get("cookie") || "",
      },
      body: JSON.stringify({
        senderPortal: "employee",
        messageBody: "شكرا جزيلا تم استلام الرد",
      }),
    });

    const routeRes = await messagesPost(req, {
      params: Promise.resolve({ reference: testCaseRef }),
    });

    expect(routeRes.status).toBe(200);
    const data = await routeRes.json();
    expect(data.success).toBe(true);
    expect(data.message.sender_type).toBe("employee");
    expect(data.message.sender_name).toBe("سامح عبد العزيز");
    expect(data.message.message_body).toBe("شكرا جزيلا تم استلام الرد");
  });

  it("attributes message to HR when senderPortal is admin with session", async () => {
    const req = new NextRequest(`http://localhost:3000/api/cases/${testCaseRef}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: adminSessionHeaders.get("cookie") || "",
      },
      body: JSON.stringify({
        senderPortal: "admin",
        messageBody: "تمت مراجعة طلبك وإصدار الشهادة الرسمية",
        isInternal: false,
      }),
    });

    const routeRes = await messagesPost(req, {
      params: Promise.resolve({ reference: testCaseRef }),
    });

    expect(routeRes.status).toBe(200);
    const data = await routeRes.json();
    expect(data.success).toBe(true);
    expect(data.message.sender_type).toBe("hr");
    expect(data.message.sender_name).toBe("الموارد البشرية");
  });

  it("includes messageId on attachments in buildAuthorizedCaseView", async () => {
    const [c] = await db.select().from(cases).where(eq(cases.id, testCaseId)).limit(1);
    expect(c).toBeDefined();

    // Insert dummy attachment linked to a message
    const [msg] = await db
      .select()
      .from(case_messages)
      .where(eq(case_messages.case_id, testCaseId))
      .limit(1);

    await db.insert(attachments).values({
      case_id: testCaseId,
      message_id: msg.id,
      original_filename: "salary_cert.pdf",
      storage_key: `cases/2026/11/test-${Date.now()}-salary_cert.pdf`,
      file_type: "application/pdf",
      file_size: 1024,
      uploader_type: "hr",
      is_verified: true,
    });

    const view = await CaseService.buildAuthorizedCaseView(c, true);
    const hrAtt = view.attachments.find((a) => a.uploaderType === "hr");

    expect(hrAtt).toBeDefined();
    expect(hrAtt?.filename).toBe("salary_cert.pdf");
    expect(hrAtt?.messageId).toBe(msg.id);
    expect(hrAtt?.downloadUrl).toBeDefined();
  });
});
