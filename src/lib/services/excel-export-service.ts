import ExcelJS from "exceljs";
import { db } from "@/db";
import { cases, categories } from "@/db/schema";
import { sql, and, eq, ilike, or, desc } from "drizzle-orm";
import { STATUS_LABELS, formatCairoDate } from "../validation";

export interface ExcelExportOptions {
  caseType?: "request" | "complaint";
  search?: string;
  categoryId?: string;
  status?: string;
  isUnread?: boolean;
}

/**
 * Sanitizes cell values to prevent spreadsheet formula injection.
 * Prepends a single quote if string begins with =, +, -, @, or tab/CR.
 */
function sanitizeFormulaInjection(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export class ExcelExportService {
  static async generateWorkbook(options: ExcelExportOptions): Promise<Buffer> {
    const conditions = [];

    if (options.caseType) {
      conditions.push(eq(cases.case_type, options.caseType));
    }
    if (options.categoryId) {
      conditions.push(eq(cases.category_id, options.categoryId));
    }
    if (options.status) {
      conditions.push(eq(cases.status, options.status));
    }
    if (options.isUnread !== undefined) {
      conditions.push(eq(cases.is_unread, options.isUnread));
    }
    if (options.search && options.search.trim() !== "") {
      const q = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(cases.reference, q),
          ilike(cases.employee_name, q),
          ilike(cases.employee_number, q),
          ilike(cases.phone_number, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch ALL matching records
    const records = await db
      .select({
        reference: cases.reference,
        caseType: cases.case_type,
        categoryNameAr: cases.category_name_ar,
        employeeName: cases.employee_name,
        employeeNumber: cases.employee_number,
        phoneNumber: cases.phone_number,
        profession: cases.profession,
        status: cases.status,
        isUnread: cases.is_unread,
        isIdentityVerified: cases.is_identity_verified,
        submissionDate: cases.submission_date,
        lastUpdatedAt: cases.last_updated_at,
        completionDate: cases.completion_date,
        answers: cases.answers,
      })
      .from(cases)
      .where(whereClause)
      .orderBy(desc(cases.submission_date));

    // Create ExcelJS Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "بوابة خدمات العاملين";
    workbook.created = new Date();

    const sheetName =
      options.caseType === "request"
        ? "سجل الطلبات"
        : options.caseType === "complaint"
        ? "سجل الشكاوى"
        : "سجل المعاملات";

    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
    });

    // Define columns
    worksheet.columns = [
      { header: "رقم المعاملة", key: "reference", width: 18 },
      { header: "نوع المعاملة", key: "caseType", width: 14 },
      { header: "الخدمة / الفئة", key: "category", width: 28 },
      { header: "اسم الموظف", key: "name", width: 25 },
      { header: "الرقم الثابت", key: "empNumber", width: 16 },
      { header: "رقم الموبايل", key: "phone", width: 18 },
      { header: "المسمى الوظيفي", key: "profession", width: 20 },
      { header: "حالة المعاملة", key: "status", width: 18 },
      { header: "التحقق من الهوية", key: "verified", width: 16 },
      { header: "تاريخ التقديم", key: "submissionDate", width: 22 },
      { header: "تاريخ الإكمال", key: "completionDate", width: 22 },
      { header: "البيانات والملاحظات", key: "details", width: 40 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" }, // Navy blue
      };
      cell.font = {
        color: { argb: "FFFFFFFF" },
        bold: true,
        size: 11,
        name: "Cairo",
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });

    // Add Rows
    for (const item of records) {
      const statusLabel = STATUS_LABELS[item.status]?.label || item.status;
      const caseTypeLabel = item.caseType === "request" ? "طلب" : "شكوى";

      // Flatten non-sensitive answers
      const answersText = Object.entries(item.answers || {})
        .filter(([k]) => k !== "national_id")
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");

      const row = worksheet.addRow({
        reference: sanitizeFormulaInjection(item.reference),
        caseType: caseTypeLabel,
        category: sanitizeFormulaInjection(item.categoryNameAr),
        name: sanitizeFormulaInjection(item.employeeName),
        empNumber: sanitizeFormulaInjection(item.employeeNumber),
        phone: sanitizeFormulaInjection(item.phoneNumber),
        profession: sanitizeFormulaInjection(item.profession || "—"),
        status: statusLabel,
        verified: item.isIdentityVerified ? "تم التحقق يدوياً" : "قيد المراجعة",
        submissionDate: formatCairoDate(item.submissionDate),
        completionDate: item.completionDate ? formatCairoDate(item.completionDate) : "—",
        details: sanitizeFormulaInjection(answersText),
      });

      // Force employee number and phone number to be text cells
      row.getCell("empNumber").numFmt = "@";
      row.getCell("phone").numFmt = "@";
      row.getCell("reference").numFmt = "@";

      row.height = 24;
      row.alignment = { vertical: "middle", horizontal: "right" };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
