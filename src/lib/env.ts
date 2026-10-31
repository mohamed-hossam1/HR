import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().default("development-auth-secret-32-chars-long-placeholder!"),
  BETTER_AUTH_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  TRACKING_SECRET_PEPPER: z.string().default("default-tracking-secret-pepper-32-chars-key-123"),
  SENSITIVE_DATA_ENCRYPTION_KEY: z.string().default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  B2_ENDPOINT: z.string().optional().default(""),
  B2_REGION: z.string().optional().default(""),
  B2_BUCKET_NAME: z.string().optional().default(""),
  B2_KEY_ID: z.string().optional().default(""),
  B2_APPLICATION_KEY: z.string().optional().default(""),
  B2_SOFT_STORAGE_LIMIT_MB: z.coerce.number().default(8000),
  ADMIN_INITIAL_EMAIL: z.string().optional().default("admin@portal.local"),
  ADMIN_INITIAL_PASSWORD: z.string().optional().default("AdminStrongPass2026!"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  TRACKING_SECRET_PEPPER: process.env.TRACKING_SECRET_PEPPER,
  SENSITIVE_DATA_ENCRYPTION_KEY: process.env.SENSITIVE_DATA_ENCRYPTION_KEY,
  B2_ENDPOINT: process.env.B2_ENDPOINT,
  B2_REGION: process.env.B2_REGION,
  B2_BUCKET_NAME: process.env.B2_BUCKET_NAME,
  B2_KEY_ID: process.env.B2_KEY_ID,
  B2_APPLICATION_KEY: process.env.B2_APPLICATION_KEY,
  B2_SOFT_STORAGE_LIMIT_MB: process.env.B2_SOFT_STORAGE_LIMIT_MB,
  ADMIN_INITIAL_EMAIL: process.env.ADMIN_INITIAL_EMAIL,
  ADMIN_INITIAL_PASSWORD: process.env.ADMIN_INITIAL_PASSWORD,
  NODE_ENV: process.env.NODE_ENV,
});
