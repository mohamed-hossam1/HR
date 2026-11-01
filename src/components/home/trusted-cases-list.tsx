"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { STATUS_LABELS, formatCairoDate } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock, ExternalLink, Shield, AlertCircle } from "lucide-react";

interface SavedCase {
  id: string;
  reference: string;
  case_type: "request" | "complaint";
  category_name_ar: string;
  status: string;
  submission_date: string;
}

function TrustedCasesSkeleton() {
  return (
    <section
      className="mt-12 overflow-hidden rounded-xl border border-[#dedbd4] bg-white shadow-sm"
      role="status"
      aria-label="جارٍ تحميل معاملاتك السابقة"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[#ebe8e2] bg-[#f7f6f3] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="skeleton h-10 w-10 shrink-0 rounded-lg" />
          <div className="w-full max-w-sm space-y-2">
            <div className="skeleton h-4 w-48 max-w-full rounded" />
            <div className="skeleton h-3 w-72 max-w-[85%] rounded" />
          </div>
        </div>
        <div className="skeleton hidden h-8 w-36 rounded-md sm:block" />
      </div>
      <div className="divide-y divide-[#ebe8e2]">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-5 px-5 py-5 sm:px-6">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="skeleton h-4 w-36 rounded" />
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
              <div className="skeleton h-3.5 w-52 max-w-[75%] rounded" />
              <div className="skeleton h-3 w-28 rounded" />
            </div>
            <div className="skeleton h-9 w-32 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
      <span className="sr-only">جارٍ تحميل معاملاتك السابقة...</span>
    </section>
  );
}

export function TrustedCasesList() {
  const [cases, setCases] = useState<SavedCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    let isActive = true;

    async function loadCases() {
      try {
        const res = await fetch("/api/cases/my-cases", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

        const data = await res.json();
        if (!isActive) return;
        setCases(data.cases || []);
        setLoadFailed(false);
      } catch (err) {
        if (!isActive) return;
        setLoadFailed(true);
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.warn("Failed to load device cases:", err);
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (isActive) setIsLoading(false);
      }
    }

    loadCases();

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [retryKey]);

  if (isLoading) {
    return <TrustedCasesSkeleton />;
  }

  if (loadFailed) {
    return (
      <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm sm:flex-row">
        <div className="flex items-center gap-2 text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>تعذر تحميل معاملاتك السابقة الآن. تحقق من الاتصال وحاول مرة أخرى.</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsLoading(true);
            setRetryKey((key) => key + 1);
          }}
          className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
        >
          إعادة المحاولة
        </Button>
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
