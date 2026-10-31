import Link from "next/link";
import { FilePlus2, AlertOctagon, Search, ArrowLeft, ShieldCheck, Clock4 } from "lucide-react";
import { TrustedCasesList } from "@/components/home/trusted-cases-list";

export default function HomePage() {
  return (
    <div className="py-6 sm:py-10 space-y-12">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
          <span>المنصة الرسمية المعتمدة لخدمات العاملين</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          بوابة خدمات العاملين
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
          تقديم الطلبات والشكاوى ومتابعتها إلكترونيًا بكل سهولة ويسر وبدون الحاجة لإنشاء حساب
        </p>
      </div>

      {/* Three Primary Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Action 1: Create Request */}
        <Link
          href="/requests"
          className="group relative bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xs hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center group-hover:bg-blue-900 group-hover:text-white transition-colors">
              <FilePlus2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                إنشاء طلب جديد
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                شهادات مفردات المرتب، بدل فاقد فيزا، مذكرات العلاج، منح الزواج، والسلف المالية.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-blue-900 mt-6 group-hover:translate-x-[-4px] transition-transform">
            <span>تصفح وتقديم الطلبات</span>
            <ArrowLeft className="w-4 h-4 mr-1" />
          </div>
        </Link>

        {/* Action 2: Create Complaint */}
        <Link
          href="/complaints"
          className="group relative bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xs hover:shadow-md hover:border-purple-400 transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-900 flex items-center justify-center group-hover:bg-purple-900 group-hover:text-white transition-colors">
              <AlertOctagon className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-purple-900 transition-colors">
                إنشاء شكوى أو تظلم
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                تظلمات زيادة المرتب، تأخر استخراج الفيزا، طلبات الترقية، وأي شكاوى أخرى.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-purple-900 mt-6 group-hover:translate-x-[-4px] transition-transform">
            <span>تقديم شكوى للموارد البشرية</span>
            <ArrowLeft className="w-4 h-4 mr-1" />
          </div>
        </Link>

        {/* Action 3: Track Case */}
        <Link
          href="/track"
          className="group relative bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-900 flex items-center justify-center group-hover:bg-emerald-800 group-hover:text-white transition-colors">
              <Search className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                استعلام ومتابعة
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                متابعة حالة طلب أو شكوى سابقة باستخدام الرقم الثابت وكود المتابعة السري.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-emerald-800 mt-6 group-hover:translate-x-[-4px] transition-transform">
            <span>الاستعلام عن المعاملات</span>
            <ArrowLeft className="w-4 h-4 mr-1" />
          </div>
        </Link>
      </div>

      {/* Trusted Device Saved Cases */}
      <TrustedCasesList />
    </div>
  );
}
