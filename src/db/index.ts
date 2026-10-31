import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __db_pool: Pool | undefined;
}

const isSupabase = env.DATABASE_URL.includes("supabase.com") || env.DATABASE_URL.includes("pooler");

const pool =
  global.__db_pool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  global.__db_pool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
