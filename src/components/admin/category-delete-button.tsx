"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface CategoryDeleteButtonProps {
  categoryId: string;
  categoryName: string;
  categoryType: "request" | "complaint";
}

export function CategoryDeleteButton({
  categoryId,
  categoryName,
  categoryType,
}: CategoryDeleteButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLabel = categoryType === "request" ? "فئة طلب" : "فئة شكوى";

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل حذف الفئة");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء محاولة حذف الفئة");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        title={`حذف ${categoryName}`}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>حذف</span>
      </button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-right"
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeleting) setIsOpen(false);
          }}
        >
          <Card
            className="max-w-md w-full bg-white shadow-2xl border-rose-200 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>تأكيد حذف الفئة والنموذج</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-900 leading-relaxed">
                <p className="font-bold">
                  هل أنت متأكد من رغبتك في حذف &ldquo;{categoryName}&rdquo; ({typeLabel})؟
                </p>
                <div className="text-[11px] text-rose-800 font-semibold flex items-start gap-1.5 pt-1">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>
                    تحذير: سيتم حذف نموذج هذه الفئة، ولن تظهر بعد الآن في بوابة العاملين. كما سيتم حذف كافة الطلبات المقدمة تحت هذه الفئة ومرفقاتها.
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-2.5 bg-rose-100 text-rose-800 rounded-lg text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-semibold"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                      <span>تأكيد حذف الفئة</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
