import { db } from "@/db";
import { rate_limits } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * PostgreSQL-backed persistent rate limiter safe across serverless invocations.
 */
export async function checkRateLimit(
  key: string,
  maxPoints: number = 5,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const now = new Date();
  const expireAt = new Date(Date.now() + windowSeconds * 1000);

  try {
    // Atomic upsert with window check
    const result = await db.execute<{
      points: number;
      expire_at: string;
      is_reset: boolean;
    }>(sql`
      INSERT INTO rate_limits (id, key, points, expire_at)
      VALUES (gen_random_uuid(), ${key}, 1, ${expireAt.toISOString()}::timestamptz)
      ON CONFLICT (key) DO UPDATE
      SET
        points = CASE
          WHEN rate_limits.expire_at <= ${now.toISOString()}::timestamptz THEN 1
          ELSE rate_limits.points + 1
        END,
        expire_at = CASE
          WHEN rate_limits.expire_at <= ${now.toISOString()}::timestamptz THEN ${expireAt.toISOString()}::timestamptz
          ELSE rate_limits.expire_at
        END
      RETURNING points, expire_at, (rate_limits.expire_at <= ${now.toISOString()}::timestamptz) as is_reset;
    `);

    const row = result.rows[0];
    const points = row ? Number(row.points) : 1;
    const expiry = row ? new Date(row.expire_at) : expireAt;
    const resetInSeconds = Math.max(1, Math.round((expiry.getTime() - Date.now()) / 1000));

    if (points > maxPoints) {
      return {
        success: false,
        remaining: 0,
        resetInSeconds,
      };
    }

    return {
      success: true,
      remaining: Math.max(0, maxPoints - points),
      resetInSeconds,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // On unexpected DB rate limit error, fail open conservatively for low-volume MVP
    return { success: true, remaining: 1, resetInSeconds: 60 };
  }
}
