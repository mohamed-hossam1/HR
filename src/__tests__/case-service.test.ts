import { describe, it, expect, afterAll } from "vitest";
import { CaseService } from "@/lib/services/case-service";
import { pool } from "@/db";

describe("CaseService", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("successfully submits a request and generates a unique reference and tracking code", async () => {
    const result = await CaseService.submitCase({
      caseType: "request",
      categorySlug: "salary-certificate",
      employee_number: "001234",
      employee_name: "أحمد محمود علي",
      phone_number: "01012345678",
      profession: "محاسب",
      answers: {
        profession: "محاسب",
        project_name: "مشروع العاصمة الإدارية",
        purpose: "استخراج قرض بنكي",
        bank_name: "البنك الأهلي المصري",
      },
      uploadedAttachments: [],
    });

    expect(result.reference).toMatch(/^REQ-\d{4}-\d{6}$/);
    expect(result.trackingCode).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    expect(result.categoryNameAr).toBe("طلب مفردات مرتب");

    // Test tracking using employee number and tracking code
    const tracked = await CaseService.trackCaseByCredentials("001234", result.trackingCode);
    expect(tracked).not.toBeNull();
    expect(tracked?.reference).toBe(result.reference);
    expect(tracked?.employee_number).toBe("001234");
    expect(tracked?.status).toBe("pending");
  });

  it("rejects submission if required fields are missing", async () => {
    await expect(
      CaseService.submitCase({
        caseType: "request",
        categorySlug: "salary-certificate",
        employee_number: "005678",
        employee_name: "محمد إبراهيم",
        phone_number: "01099998888",
        answers: {
          profession: "مهندس",
          // Missing required project_name, purpose, bank_name
        },
        uploadedAttachments: [],
      })
    ).rejects.toThrow();
  });

  it("preserves leading zeros in employee number", async () => {
    const result = await CaseService.submitCase({
      caseType: "complaint",
      categorySlug: "salary-increase",
      employee_number: "000789",
      employee_name: "خالد سعيد",
      phone_number: "01123456789",
      profession: "فني كهرباء",
      answers: {
        profession: "فني كهرباء",
        complaint_details: "شكوى بخصوص تأخر استحقاق الزيادة السنوية للراتب",
      },
      uploadedAttachments: [],
    });

    expect(result.reference).toMatch(/^CMP-\d{4}-\d{6}$/);

    const tracked = await CaseService.trackCaseByCredentials("000789", result.trackingCode);
    expect(tracked).not.toBeNull();
    expect(tracked?.employee_number).toBe("000789");
  });
});
