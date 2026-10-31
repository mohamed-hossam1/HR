import { describe, it, expect } from "vitest";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

describe("Better Auth Username Authentication", () => {
  it("authenticates admin user with username and password", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-in/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: env.ADMIN_INITIAL_USERNAME,
        password: env.ADMIN_INITIAL_PASSWORD,
      }),
    });

    const res = await auth.handler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.username).toBe(env.ADMIN_INITIAL_USERNAME.toLowerCase());
    expect(body.token).toBeDefined();
  });

  it("handles case-insensitive username normalization", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-in/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: env.ADMIN_INITIAL_USERNAME.toUpperCase(),
        password: env.ADMIN_INITIAL_PASSWORD,
      }),
    });

    const res = await auth.handler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user.username).toBe(env.ADMIN_INITIAL_USERNAME.toLowerCase());
  });

  it("fails when password is incorrect", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-in/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: env.ADMIN_INITIAL_USERNAME,
        password: "WrongPassword999!",
      }),
    });

    const res = await auth.handler(req);
    expect(res.status).not.toBe(200);
  });

  it("fails when username does not exist", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-in/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "nonexistent_user_12345",
        password: "AdminStrongPass2026!",
      }),
    });

    const res = await auth.handler(req);
    expect(res.status).not.toBe(200);
  });
});

describe("Next.js 16 Proxy Authentication Guard", () => {
  it("redirects unauthenticated /admin directly to /admin/login at HTTP level", async () => {
    const { proxy } = await import("@/proxy");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest("http://localhost:3000/admin");
    const res = proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login");
  });

  it("redirects unauthenticated nested /admin/:path directly to /admin/login", async () => {
    const { proxy } = await import("@/proxy");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest("http://localhost:3000/admin/requests");
    const res = proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin/login");
  });

  it("allows unauthenticated user to access /admin/login without redirect", async () => {
    const { proxy } = await import("@/proxy");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest("http://localhost:3000/admin/login");
    const res = proxy(req);

    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects authenticated user visiting /admin/login to /admin", async () => {
    const { proxy } = await import("@/proxy");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest("http://localhost:3000/admin/login", {
      headers: { cookie: "better-auth.session_token=valid-test-token" },
    });
    const res = proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/admin");
  });

  it("allows authenticated user to access /admin directly", async () => {
    const { proxy } = await import("@/proxy");
    const { NextRequest } = await import("next/server");

    const req = new NextRequest("http://localhost:3000/admin", {
      headers: { cookie: "better-auth.session_token=valid-test-token" },
    });
    const res = proxy(req);

    expect(res.headers.get("location")).toBeNull();
  });
});

