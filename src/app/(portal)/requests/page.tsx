import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Briefcase,
  FileSpreadsheet,
  Pill,
  HeartHandshake,
  Coins,
  ShoppingCart,
  Users,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";


const ICON_MAP: Record<string, any> = {
  Banknote,
  CreditCard,
  Briefcase,
  FileSpreadsheet,
  Pill,
  HeartHandshake,
  Coins,
  ShoppingCart,
  Users,
};

export default async function RequestsPage() {
  const list = await db
    .select()
    .from(categories)
    .where(and(eq(categories.type, "request"), eq(categories.is_active, true)))
    .orderBy(categories.display_order);

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2 sm:py-4">
      <div className="orange-rule border-b border-[#dedbd4] pb-5">
        <span className="eyebrow mb-2">خدمات العاملين</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          دليل طلبات العاملين بقطاع الكباري
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          اختر نوع الطلب المطلوب للبدء في تعبئة النموذج الإلكتروني ورفع المستندات المطلوبة
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((cat) => {
          const IconComponent = (cat.icon && ICON_MAP[cat.icon]) || FileText;

          return (
            <Link
              key={cat.id}
              href={`/requests/${cat.slug}`}
              className="group surface-card rounded-xl p-6 hover:-translate-y-1 hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-orange-50 text-[#d94605] flex items-center justify-center group-hover:bg-[#f9580e] group-hover:text-white transition-colors">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#c63f00] transition-colors">
                    {cat.name_ar}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {cat.description_ar || "تقديم طلب إلكتروني للإدارة المختصة"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-[#c63f00] mt-5 group-hover:translate-x-[-3px] transition-transform">
                <span>تعبئة وتقديم الطلب</span>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
