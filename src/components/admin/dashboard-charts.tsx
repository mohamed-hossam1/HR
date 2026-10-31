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

export function DashboardCharts({ statusBreakdown, topCategories }: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-72">
        <div className="bg-white rounded-2xl border border-slate-200 animate-pulse" />
        <div className="bg-white rounded-2xl border border-slate-200 animate-pulse" />
      </div>
    );
  }

  const hasStatusData = statusBreakdown.some((s) => s.count > 0);
  const hasCategoryData = topCategories.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Status Distribution */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-800">
            توزيع الحالات (مكتملة مقابل قيد المتابعة)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-6">
          {hasStatusData ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    label={(props: any) =>
                      props.value && props.value > 0 ? `${props.name}: ${props.value}` : ""
                    }
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} معاملة`, name]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: "12px",
                      fontSize: "12px",
                      textAlign: "right",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              لا توجد بيانات كافية لعرض الرسم البياني
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart 2: Top Categories */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardHeader className="pb-2 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-800">
            أكثر الخدمات طلباً وشكاوى واردة
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-6">
          {hasCategoryData ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategories} layout="vertical" margin={{ right: 30, left: 10 }}>
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 11, fill: "#475569" }}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} معاملة`, "العدد"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      color: "#fff",
                      borderRadius: "12px",
                      fontSize: "12px",
                      textAlign: "right",
                    }}
                  />
                  <Bar dataKey="count" fill="#1e3a8a" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              لا توجد طلبات واردة في الفترة المحددة
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
