import { db, pool } from "@/db";
import { user, account } from "@/db/schema";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { env } from "@/lib/env";

async function seedAdmin() {
  const email = process.env.ADMIN_INITIAL_EMAIL || env.ADMIN_INITIAL_EMAIL || "admin@portal.local";
  const password = process.env.ADMIN_INITIAL_PASSWORD || env.ADMIN_INITIAL_PASSWORD || "AdminStrongPass2026!";
  const name = "مدير الموارد البشرية";

  console.log(`Checking existing admin user for: ${email}...`);

  try {
    const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);

    if (existing.length > 0) {
      console.log(`Admin user with email ${email} already exists (ID: ${existing[0].id}).`);
      const hashedPassword = await hashPassword(password);
      await db
        .update(account)
        .set({
          accountId: existing[0].id,
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(account.userId, existing[0].id));
      console.log(`Admin password and account updated successfully for ${email}.`);
      return;
    }

    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);

    await db.insert(user).values({
      id: userId,
      email,
      name,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(account).values({
      id: accountId,
      userId,
      accountId: userId, // Better Auth requires accountId to equal userId for credential provider
      providerId: "credential",
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ HR Admin successfully created!`);
    console.log(`   البريد الإلكتروني: ${email}`);
    console.log(`   كلمة المرور: ${password}`);
  } catch (error) {
    console.error("❌ Failed to seed admin user:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAdmin();
