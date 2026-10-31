import { describe, it, expect, afterAll } from "vitest";
import { CaseService } from "@/lib/services/case-service";
import { db, pool } from "@/db";
import { cases, categories, trusted_devices, trusted_device_cases } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateSecureToken, hashDeviceToken } from "@/lib/crypto";
import { isDeviceAuthorizedForCase } from "@/lib/device-token";

describe("End-to-End System Workflows (Definition of Done)", () => {
  afterAll(async () => {
    await pool.end();
  });

  let createdCaseRef: string;
  let createdTrackingCode: string;
  let deviceToken: string;
  let deviceId: string;

  it("Workflow 1: Employee submits a salary certificate request with leading zero and links to trusted device", async () => {
    // 1. Simulate trusted device creation
    deviceToken = generateSecureToken(32);
    const tokenHash = hashDeviceToken(deviceToken);
    const [dev] = await db
      .insert(trusted_devices)
      .values({
        device_token_hash: tokenHash,
        user_agent: "Mozilla/5.0 (iPhone; Mobile)",
        ip_address: "127.0.0.1",
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        is_revoked: false,
      })
      .returning();
    deviceId = dev.id;

    // 2. Employee submits request
    const submission = await CaseService.submitCase({
      caseType: "request",
      categorySlug: "salary-certificate",
      employee_number: "000456", // leading zero preserved
      employee_name: "سامح عبد العزيز مصطفى",
      phone_number: "01012345678",
      profession: "محاسب تكاليف",
      answers: {
        profession: "محاسب تكاليف",
        project_name: "فرع الإسكندرية",
        purpose: "استخراج تأشيرة سفر وسياحة",
        bank_name: "البنك الأهلي المصري",
      },
      uploadedAttachments: [],
      deviceId,
    });

    expect(submission.reference).toMatch(/^REQ-\d{4}-\d{6}$/);
    expect(submission.trackingCode).toBeDefined();
    createdCaseRef = submission.reference;
    createdTrackingCode = submission.trackingCode;

    // 3. Verify trusted device session can view case without re-entering tracking code
    const isAuthorized = await isDeviceAuthorizedForCase(deviceToken, submission.caseId);
    expect(isAuthorized).toBe(true);

    const deviceCaseView = await CaseService.getCaseByDeviceSession(createdCaseRef, deviceToken);
    expect(deviceCaseView).not.toBeNull();
    expect(deviceCaseView?.employee_number).toBe("000456");
    expect(deviceCaseView?.status).toBe("pending");
  });

  it("Workflow 2 & 3: HR Manager opens case, updates status, and employee views updated status", async () => {
    // 1. Find the case
    const [caseRecord] = await db
      .select()
      .from(cases)
      .where(eq(cases.reference, createdCaseRef))
      .limit(1);

    expect(caseRecord).toBeDefined();

    // 2. Manager changes status to in_progress then completed
    await db
      .update(cases)
      .set({
        status: "in_progress",
        last_updated_at: new Date(),
      })
      .where(eq(cases.id, caseRecord.id));

    // 3. Manager marks completed
    await db
      .update(cases)
      .set({
        status: "completed",
        completion_date: new Date(),
        last_updated_at: new Date(),
      })
      .where(eq(cases.id, caseRecord.id));

    // 4. Employee views case from trusted device and sees 'completed'
    const updatedView = await CaseService.getCaseByDeviceSession(createdCaseRef, deviceToken);
    expect(updatedView?.status).toBe("completed");
    expect(updatedView?.employee_name).toBe("سامح عبد العزيز مصطفى");
  });

  it("Workflow 4: Inquiry from another device using employee number and tracking code", async () => {
    // New device token
    const newDeviceToken = generateSecureToken(32);
    const newDeviceHash = hashDeviceToken(newDeviceToken);
    const [newDev] = await db
      .insert(trusted_devices)
      .values({
        device_token_hash: newDeviceHash,
        user_agent: "Desktop Chrome",
        ip_address: "192.168.1.50",
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        is_revoked: false,
      })
      .returning();

    // Before tracking, new device is NOT authorized
    const isAuthBefore = await isDeviceAuthorizedForCase(newDeviceToken, createdCaseRef);
    expect(isAuthBefore).toBe(false);

    // Track using credentials from new device with rememberDevice=true
    const tracked = await CaseService.trackCaseByCredentials(
      "000456",
      createdTrackingCode,
      newDev.id
    );

    expect(tracked).not.toBeNull();
    expect(tracked?.reference).toBe(createdCaseRef);

    // Now new device IS authorized!
    const isAuthAfter = await isDeviceAuthorizedForCase(newDeviceToken, tracked!.id);
    expect(isAuthAfter).toBe(true);

    // Reopen without tracking code from new device
    const reopened = await CaseService.getCaseByDeviceSession(createdCaseRef, newDeviceToken);
    expect(reopened).not.toBeNull();
    expect(reopened?.reference).toBe(createdCaseRef);
  });

  it("Workflow 5: Dynamic category creation without code changes", async () => {
    const slug = `special-leave-${Date.now()}`;
    const [newCategory] = await db
      .insert(categories)
      .values({
        type: "request",
        slug,
        name_ar: "طلب إجازة استثنائية",
        description_ar: "إجازة خاصة لرعاية الوالدين أو ظروف طارئة",
        icon: "Calendar",
        field_schema: [
          {
            id: "leave_days",
            label_ar: "عدد أيام الإجازة المطلوبة",
            type: "number",
            required: true,
            order: 1,
          },
          {
            id: "leave_reason",
            label_ar: "سبب الإجازة الاستثنائية",
            type: "textarea",
            required: true,
            order: 2,
          },
        ],
        form_version: 1,
        is_active: true,
        display_order: 50,
      })
      .returning();

    expect(newCategory).toBeDefined();
    expect(newCategory.name_ar).toBe("طلب إجازة استثنائية");

    // Employee immediately submits this newly created category without code changes!
    const submission = await CaseService.submitCase({
      caseType: "request",
      categorySlug: slug,
      employee_number: "009988",
      employee_name: "طارق سليم",
      phone_number: "01234567890",
      answers: {
        leave_days: 5,
        leave_reason: "ظرف عائلي طارئ",
      },
      uploadedAttachments: [],
    });

    expect(submission.reference).toMatch(/^REQ-\d{4}-\d{6}$/);
    expect(submission.categoryNameAr).toBe("طلب إجازة استثنائية");

    // Check that historical submission snapshot contains the exact fields
    const [savedCase] = await db
      .select()
      .from(cases)
      .where(eq(cases.reference, submission.reference))
      .limit(1);

    expect(savedCase.category_schema_snapshot).toHaveLength(2);
    expect(savedCase.answers).toEqual({
      leave_days: 5,
      leave_reason: "ظرف عائلي طارئ",
    });
  });
});
