"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_LABELS, formatCairoDate } from "@/lib/validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock, ExternalLink, Trash2, Shield, AlertCircle } from "lucide-react";

interface SavedCase {
  id: string;
  reference: string;
  case_type: "request" | "complaint";
  category_name_ar: string;
  status: string;
  submission_date: string;
}

export function TrustedCasesList() {
  const [cases, setCases] = useState<SavedCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    async function loadCases() {
      try {
        const res = await fetch("/api/cases/my-cases");
        if (res.ok) {
          const data = await res.json();
          setCases(data.cases || []);
        }
      } catch (err) {
        console.warn("Failed to load device cases:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCases();
  }, []);

  const handleClearDevice = async () => {
    if (!confirm("هل أنت متأكد من رغبتك في إزالة الطلبات المحفوظة من هذا المتصفح؟ ستحتاج إلى كود المتابعة لفتحها مجدداً.")) {
      return;
    }

    setIsClearing(true);
    try {
      await fetch("/api/cases/my-cases", { method: "DELETE" });
      localStorage.removeItem("es_saved_cases");
      setCases([]);
    } catch (err) {
      console.error("Failed to clear device:", err);
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm animate-pulse">
        جاري تحميل معاملاتك السابقة...
      </div>
    );
  }

  if (cases.length === 0) {
    return null; // Don't clutter homepage if no cases have been submitted from this device yet
  }

  return (
    <Card className="border-slate-200/90 shadow-sm overflow-hidden bg-white mt-12">
      <CardHeader className="bg-slate-50/70 border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-900" />
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              طلباتي وشكاويّ المسجلة من هذا الجهاز
            </CardTitle>
            <p className="text-xs text-slate-500">
              يمكنك متابعة وتصفح هذه المعاملات مباشرة دون الحاجة لإدخال كود المتابعة
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearDevice}
          disabled={isClearing}
          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 self-start sm:self-auto cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 ml-1" />
          إزالة الطلبات من هذا الجهاز
        </Button>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-slate-100">
        {cases.map((c) => {
          const statusConfig = STATUS_LABELS[c.status] || {
            label: c.status,
            color: "text-slate-700",
            bg: "bg-slate-100 border-slate-200",
          };

          return (
            <div
              key={c.id}
              className="p-4 sm:px-6 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-blue-950">
                    {c.reference}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.bg} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800">{c.category_name_ar}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatCairoDate(c.submission_date)}</span>
                </div>
              </div>

              <Link
                href={`/track/${c.reference}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-50 text-blue-900 hover:bg-blue-100 transition-colors self-start sm:self-auto"
              >
                <span>عرض التفاصيل والردود</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
