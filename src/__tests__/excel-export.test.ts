import { describe, it, expect, afterAll } from "vitest";
import { ExcelExportService } from "@/lib/services/excel-export-service";
import { pool } from "@/db";

describe("Excel Export Service", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("generates a valid XLSX buffer", async () => {
    const buffer = await ExcelExportService.generateWorkbook({
      caseType: "request",
    });

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(100);
    // Standard ZIP/XLSX header starts with PK (0x50, 0x4b)
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });
});
