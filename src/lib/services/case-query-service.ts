import { db } from "@/db";
import { cases, attachments, categories } from "@/db/schema";
import { sql, and, eq, ilike, or, gte, lte, desc } from "drizzle-orm";

export interface CaseQueryFilters {
  caseType?: "request" | "complaint";
  search?: string;
  categoryId?: string;
  status?: string;
  isUnread?: boolean;
  page?: number;
  pageSize?: number;
}

export class CaseQueryService {
  static async queryCases(filters: CaseQueryFilters) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 15;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (filters.caseType) {
      conditions.push(eq(cases.case_type, filters.caseType));
    }

    if (filters.categoryId) {
      conditions.push(eq(cases.category_id, filters.categoryId));
    }

    if (filters.status) {
      conditions.push(eq(cases.status, filters.status));
    }

    if (filters.isUnread !== undefined) {
      conditions.push(eq(cases.is_unread, filters.isUnread));
    }

    if (filters.search && filters.search.trim() !== "") {
      const q = `%${filters.search.trim()}%`;
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

    // Total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::integer` })
      .from(cases)
      .where(whereClause);

    const totalCount = Number(countResult?.count || 0);
    const totalPages = Math.ceil(totalCount / pageSize);

    // Records with attachment count
    const rows = await db
      .select({
        id: cases.id,
        reference: cases.reference,
        case_type: cases.case_type,
        category_id: cases.category_id,
        category_name_ar: cases.category_name_ar,
        employee_name: cases.employee_name,
        employee_number: cases.employee_number,
        phone_number: cases.phone_number,
        status: cases.status,
        is_unread: cases.is_unread,
        submission_date: cases.submission_date,
        last_updated_at: cases.last_updated_at,
        attachmentCount: sql<number>`(
          SELECT COUNT(*)::integer FROM attachments WHERE attachments.case_id = cases.id
        )`,
      })
      .from(cases)
      .where(whereClause)
      .orderBy(desc(cases.submission_date))
      .limit(pageSize)
      .offset(offset);

    return {
      cases: rows,
      totalCount,
      totalPages,
      currentPage: page,
      pageSize,
    };
  }
}
