"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface DashboardChartsProps {
  statusBreakdown: Array<{ name: string; count: number; fill: string }>;
  topCategories: Array<{ name: string; count: number; type: string }>;
}

export const DashboardCharts = React.memo(function DashboardCharts({
  statusBreakdown,
  topCategories,
}: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-72 min-w-0">
        <div className="min-w-0 animate-pulse rounded-xl border border-[#dedbd4] bg-white" />
        <div className="min-w-0 animate-pulse rounded-xl border border-[#dedbd4] bg-white" />
      </div>
    );
  }

  const hasStatusData = statusBreakdown.some((s) => s.count > 0);
  const hasCategoryData = topCategories.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
      {/* Chart 1: Status Distribution */}
      <Card className="min-w-0 overflow-hidden border-[#dedbd4] bg-white shadow-xs">
        <CardHeader className="border-b border-[#ebe8e2] pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#20272d]">
            <span className="h-4 w-1 rounded-full bg-[#f9580e]" aria-hidden="true" />
            توزيع الحالات (مكتملة مقابل قيد المتابعة)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-4">
          {hasStatusData ? (
            <div className="h-[260px] w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={260} debounce={50} minWidth={0}>
                <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                  <Pie
                    data={statusBreakdown}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={2}
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} معاملة`, name]}
                    contentStyle={{
                      backgroundColor: "#20272d",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      textAlign: "right",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-xs text-slate-400">
              لا توجد بيانات كافية لعرض الرسم البياني
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Top Categories */}
      <Card className="min-w-0 overflow-hidden border-[#dedbd4] bg-white shadow-xs">
        <CardHeader className="border-b border-[#ebe8e2] pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#20272d]">
            <span className="h-4 w-1 rounded-full bg-[#f9580e]" aria-hidden="true" />
            أكثر الخدمات طلباً وشكاوى واردة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-4">
          {hasCategoryData ? (
            <div className="h-[260px] w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height={260} debounce={50} minWidth={0}>
                <BarChart data={topCategories} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#667078" }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    tick={{ fontSize: 11, fill: "#586169" }}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} معاملة`, "العدد"]}
                    contentStyle={{
                      backgroundColor: "#20272d",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      textAlign: "right",
                    }}
                  />
                  <Bar dataKey="count" fill="#f9580e" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-xs text-slate-400">
              لا توجد طلبات واردة في الفترة المحددة
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
