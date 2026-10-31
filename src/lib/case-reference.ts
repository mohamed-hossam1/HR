import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Generates an atomic, collision-proof case reference (e.g. REQ-2026-000001 or CMP-2026-000001).
 * Uses PostgreSQL's atomic ON CONFLICT DO UPDATE RETURNING clause.
 */
export async function generateNextCaseReference(
  caseType: "request" | "complaint"
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = caseType === "request" ? "REQ" : "CMP";
  const sequenceName = `${prefix}_${currentYear}`;

  const result = await db.execute<{ last_value: number }>(sql`
    INSERT INTO case_sequences (name, last_value)
    VALUES (${sequenceName}, 1)
    ON CONFLICT (name)
    DO UPDATE SET last_value = case_sequences.last_value + 1
    RETURNING last_value;
  `);

  const nextVal = result.rows[0]?.last_value ?? 1;
  const padded = String(nextVal).padStart(6, "0");
  return `${prefix}-${currentYear}-${padded}`;
}
