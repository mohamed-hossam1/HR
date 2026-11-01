import { db } from "@/db";
import { cases, categories } from "@/db/schema";
import { sql, and, gte, lte, eq, desc } from "drizzle-orm";

export interface DashboardFilter {
  dateRange?: "today" | "7d" | "this_month" | "last_month" | "3m" | "this_year" | "all";
  startDate?: string;
  endDate?: string;
}

export class DashboardService {
  /**
   * Calculates dashboard summary statistics using server-side SQL aggregations.
   */
  static async getSummaryStats(filter: DashboardFilter = {}) {
    const conditions = [];

    const now = new Date();
    if (filter.dateRange === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      conditions.push(gte(cases.submission_date, startOfDay));
    } else if (filter.dateRange === "7d") {
      const past7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      conditions.push(gte(cases.submission_date, past7d));
    } else if (filter.dateRange === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      conditions.push(gte(cases.submission_date, startOfMonth));
    } else if (filter.dateRange === "last_month") {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      conditions.push(gte(cases.submission_date, startOfLastMonth));
      conditions.push(lte(cases.submission_date, endOfLastMonth));
    } else if (filter.dateRange === "3m") {
      const past3m = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      conditions.push(gte(cases.submission_date, past3m));
    } else if (filter.dateRange === "this_year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      conditions.push(gte(cases.submission_date, startOfYear));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fast server-side aggregations
    const [stats] = await db
      .select({
        totalRequests: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${cases.case_type} = 'request'), 0)::integer`,
        totalComplaints: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${cases.case_type} = 'complaint'), 0)::integer`,
        unreadRequests: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${cases.case_type} = 'request' AND ${cases.is_unread} = true), 0)::integer`,
        unreadComplaints: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${cases.case_type} = 'complaint' AND ${cases.is_unread} = true), 0)::integer`,
        pending: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${cases.status} = 'pending'), 0)::integer`,
        inProgress: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${cases.status} = 'in_progress'), 0)::integer`,
        awaitingEmployee: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${cases.status} = 'awaiting_employee'), 0)::integer`,
        completed: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${cases.status} = 'completed'), 0)::integer`,
        rejected: sql<number>`COALESCE(COUNT(*) FILTER (WHERE ${cases.status} = 'rejected'), 0)::integer`,
      })
      .from(cases)
      .where(whereClause);

    // Status breakdown for charts
    const statusBreakdown = [
      { name: "في الانتظار", count: Number(stats?.pending || 0), fill: "#f5a012" },
      { name: "قيد التنفيذ", count: Number(stats?.inProgress || 0), fill: "#334149" },
      { name: "بانتظار بيانات", count: Number(stats?.awaitingEmployee || 0), fill: "#c79a57" },
      { name: "مكتمل", count: Number(stats?.completed || 0), fill: "#1f8b67" },
      { name: "مرفوض", count: Number(stats?.rejected || 0), fill: "#d95555" },
    ];

    // Top categories aggregation
    const topCategories = await db
      .select({
        name: cases.category_name_ar,
        count: sql<number>`COUNT(*)::integer`,
        type: cases.case_type,
      })
      .from(cases)
      .where(whereClause)
      .groupBy(cases.category_name_ar, cases.case_type)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(6);

    // Recent cases
    const recentCases = await db
      .select({
        id: cases.id,
        reference: cases.reference,
        case_type: cases.case_type,
        category_name_ar: cases.category_name_ar,
        employee_name: cases.employee_name,
        employee_number: cases.employee_number,
        status: cases.status,
        is_unread: cases.is_unread,
        submission_date: cases.submission_date,
      })
      .from(cases)
      .orderBy(desc(cases.submission_date))
      .limit(8);

    return {
      stats: {
        totalRequests: Number(stats?.totalRequests || 0),
        totalComplaints: Number(stats?.totalComplaints || 0),
        unreadRequests: Number(stats?.unreadRequests || 0),
        unreadComplaints: Number(stats?.unreadComplaints || 0),
        pending: Number(stats?.pending || 0),
        inProgress: Number(stats?.inProgress || 0),
        awaitingEmployee: Number(stats?.awaitingEmployee || 0),
        completed: Number(stats?.completed || 0),
        rejected: Number(stats?.rejected || 0),
      },
      statusBreakdown,
      topCategories,
      recentCases,
    };
  }
}
