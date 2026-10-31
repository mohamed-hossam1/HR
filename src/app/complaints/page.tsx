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
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          دليل الشكاوى والتظلمات
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          اختر نوع الشكوى لتقديم تظلم رسمي إلى إدارة الموارد البشرية لمتابعته والبت فيه
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {list.map((cat) => {
          const IconComponent = (cat.icon && ICON_MAP[cat.icon]) || AlertCircle;

          return (
            <Link
              key={cat.id}
              href={`/complaints/${cat.slug}`}
              className="group bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-purple-400 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-900 flex items-center justify-center group-hover:bg-purple-900 group-hover:text-white transition-colors">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 group-hover:text-purple-900 transition-colors">
                    {cat.name_ar}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {cat.description_ar || "تقديم تظلم أو شكوى إلى إدارة الموارد البشرية"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-bold text-purple-900 mt-5 group-hover:translate-x-[-3px] transition-transform">
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
