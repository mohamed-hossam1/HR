import { describe, it, expect } from "vitest";
import { auth } from "@/lib/auth";

describe("Better Auth Username Authentication", () => {
  it("authenticates admin user with username and password", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-in/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "AdminStrongPass2026!",
      }),
    });

    const res = await auth.handler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.username).toBe("admin");
    expect(body.user.email).toBe("admin@portal.local");
    expect(body.token).toBeDefined();
  });

  it("handles case-insensitive username normalization", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-in/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "ADMIN",
        password: "AdminStrongPass2026!",
      }),
    });

    const res = await auth.handler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user.username).toBe("admin");
  });

  it("fails when password is incorrect", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-in/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
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
