import { describe, it, expect, afterAll } from "vitest";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { db, pool } from "@/db";
import { categories, cases, case_messages, case_audit_logs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DELETE as deleteCaseHandler } from "@/app/api/admin/cases/[id]/route";
import { DELETE as deleteCategoryHandler } from "@/app/api/admin/categories/[id]/route";
import { NextRequest } from "next/server";

describe("Admin Deletion Features (Requests, Complaints, Categories)", () => {
  let sessionCookie: string;

  afterAll(async () => {
    await pool.end();
  });

  it("authenticates admin and obtains session headers", async () => {
    const signInReq = new Request("http://localhost:3000/api/auth/sign-in/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: env.ADMIN_INITIAL_USERNAME,
        password: env.ADMIN_INITIAL_PASSWORD,
      }),
    });

    const signInRes = await auth.handler(signInReq);
    expect(signInRes.status).toBe(200);

    const setCookie = signInRes.headers.get("set-cookie");
    expect(setCookie).toBeDefined();
    sessionCookie = setCookie || "";
  });

  describe("Case Deletion API (DELETE /api/admin/cases/[id])", () => {
    it("rejects unauthenticated deletion requests with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/cases/some-id", {
        method: "DELETE",
      });

      const res = await deleteCaseHandler(req, {
        params: Promise.resolve({ id: "some-id" }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 404 when case does not exist", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/admin/cases/00000000-0000-0000-0000-000000000000",
        {
          method: "DELETE",
          headers: { cookie: sessionCookie },
        }
      );

      const res = await deleteCaseHandler(req, {
        params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
      });

      expect(res.status).toBe(404);
    });

    it("successfully deletes a case and cascades child relations", async () => {
      // 1. Create a test case
      const [testCase] = await db
        .insert(cases)
        .values({
          reference: `TEST-DEL-${Date.now()}`,
          case_type: "request",
          category_name_ar: "طلب تجريبي للحذف",
          category_schema_snapshot: [],
          employee_number: "009999",
          employee_name: "موظف اختبار الحذف",
          phone_number: "01099998888",
          tracking_code_hash: "dummyhash123",
          status: "pending",
        })
        .returning();

      expect(testCase).toBeDefined();

      // 2. Add a message linked to this case
      await db.insert(case_messages).values({
        case_id: testCase.id,
        sender_type: "hr",
        sender_name: "مدير النظام",
        message_body: "رسالة تجريبية ستُحذف تلقائياً عبر cascade",
      });

      // 3. Call DELETE API
      const req = new NextRequest(`http://localhost:3000/api/admin/cases/${testCase.id}`, {
        method: "DELETE",
        headers: { cookie: sessionCookie },
      });

      const res = await deleteCaseHandler(req, {
        params: Promise.resolve({ id: testCase.id }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // 4. Verify case is gone from DB
      const [foundCase] = await db
        .select()
        .from(cases)
        .where(eq(cases.id, testCase.id))
        .limit(1);
      expect(foundCase).toBeUndefined();

      // 5. Verify cascaded message is also gone
      const messages = await db
        .select()
        .from(case_messages)
        .where(eq(case_messages.case_id, testCase.id));
      expect(messages.length).toBe(0);

      // 6. Verify audit log was recorded
      const [audit] = await db
        .select()
        .from(case_audit_logs)
        .where(eq(case_audit_logs.action, "DELETE_CASE"))
        .orderBy(case_audit_logs.created_at)
        .limit(1);
      expect(audit).toBeDefined();
    });
  });

  describe("Category Deletion API (DELETE /api/admin/categories/[id])", () => {
    it("rejects unauthenticated category deletion with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/admin/categories/some-id", {
        method: "DELETE",
      });

      const res = await deleteCategoryHandler(req, {
        params: Promise.resolve({ id: "some-id" }),
      });

      expect(res.status).toBe(401);
    });

    it("successfully deletes a category and associated cases", async () => {
      // 1. Create a test category
      const testSlug = `test-cat-del-${Date.now()}`;
      const [testCat] = await db
        .insert(categories)
        .values({
          name_ar: "فئة تجريبية للحذف",
          type: "request",
          slug: testSlug,
          field_schema: [],
        })
        .returning();

      // 2. Create a case under this category
      const [catCase] = await db
        .insert(cases)
        .values({
          reference: `CAT-DEL-${Date.now()}`,
          case_type: "request",
          category_id: testCat.id,
          category_name_ar: testCat.name_ar,
          category_schema_snapshot: [],
          employee_number: "001234",
          employee_name: "موظف فئة محذوفة",
          phone_number: "01000000000",
          tracking_code_hash: "dummyhash",
        })
        .returning();

      // 3. Call DELETE API for category
      const req = new NextRequest(
        `http://localhost:3000/api/admin/categories/${testCat.id}`,
        {
          method: "DELETE",
          headers: { cookie: sessionCookie },
        }
      );

      const res = await deleteCategoryHandler(req, {
        params: Promise.resolve({ id: testCat.id }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // 4. Verify category is deleted
      const [foundCat] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, testCat.id))
        .limit(1);
      expect(foundCat).toBeUndefined();

      // 5. Verify cases under this category were deleted
      const [foundCase] = await db
        .select()
        .from(cases)
        .where(eq(cases.id, catCase.id))
        .limit(1);
      expect(foundCase).toBeUndefined();
    });
  });
});
