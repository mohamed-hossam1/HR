import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { TrendingUp, AlertCircle, Award, HelpCircle, ArrowLeft } from "lucide-react";


const ICON_MAP: Record<string, any> = {
  TrendingUp,
  AlertCircle,
  Award,
  HelpCircle,
};

export default async function ComplaintsPage() {
  const list = await db
    .select()
    .from(categories)
    .where(and(eq(categories.type, "complaint"), eq(categories.is_active, true)))
    .orderBy(categories.display_order);

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2 sm:py-4">
      <div className="orange-rule border-b border-[#dedbd4] pb-5">
        <span className="eyebrow mb-2">صوت العامل</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          الشكاوى والتظلمات — قطاع الكباري
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          اختر نوع الشكوى لتقديم تظلم رسمي إلى الإدارة المختصة بالقطاع لمتابعته والبت فيه
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {list.map((cat) => {
          const IconComponent = (cat.icon && ICON_MAP[cat.icon]) || AlertCircle;

          return (
            <Link
              key={cat.id}
              href={`/complaints/${cat.slug}`}
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
                    {cat.description_ar || "تقديم تظلم أو شكوى إلى الإدارة المختصة بالقطاع"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-[#c63f00] mt-5 group-hover:translate-x-[-3px] transition-transform">
                <span>تقديم الشكوى</span>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
