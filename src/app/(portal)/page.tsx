import Link from "next/link";
import {
  FilePlus2,
  AlertTriangle,
  Search,
  ArrowLeft,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import { TrustedCasesList } from "@/components/home/trusted-cases-list";

const serviceActions = [
  {
    href: "/requests",
    icon: FilePlus2,
    label: "الخدمات والطلبات",
    title: "قدّم طلبك إلكترونيًا",
    description: "اختر الخدمة المطلوبة، أرفق مستنداتك، واحصل على كود متابعة آمن.",
    action: "استعراض دليل الطلبات",
  },
  {
    href: "/complaints",
    icon: AlertTriangle,
    label: "الشكاوى والتظلمات",
    title: "صوتك يصل للإدارة المختصة",
    description: "قدّم شكوى أو تظلمًا رسميًا ببيانات واضحة مع الحفاظ على سرية معاملتك.",
    action: "تقديم شكوى أو تظلم",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-9 pb-5 sm:space-y-12">
      <section className="enter-up relative min-h-[490px] overflow-hidden rounded-[1.25rem] bg-[#20272d] text-white shadow-2xl sm:min-h-[520px]">
        <video
          className="hero-video absolute inset-0 h-full w-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/brand/bridge-hero.jpg"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/brand/arab-contractors-hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,23,27,.2),rgba(18,23,27,.92)_68%)] max-sm:bg-[linear-gradient(0deg,rgba(18,23,27,.72),rgba(18,23,27,.9))]" />
        <div className="absolute inset-y-0 right-0 hidden w-px bg-white/15 sm:right-20 sm:block" />
        <div className="absolute bottom-0 right-0 h-1.5 w-36 bg-[#f9580e] sm:w-64" />

        <div className="relative z-10 flex min-h-[490px] max-w-3xl flex-col justify-center p-6 sm:min-h-[520px] sm:p-12 lg:p-16">
          <span className="mb-5 inline-flex w-fit items-center rounded-full border border-white/20 bg-black/15 px-3 py-1.5 text-[11px] font-bold text-white/85 backdrop-blur-sm">
            قطاع الكباري والإنشاءات التخصصية
          </span>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.25] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            خدمات العاملين،
            <span className="block text-[#ff6b26]">أقرب وأوضح.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/72 sm:text-base sm:leading-8">
            منصة موحّدة لتقديم الطلبات والشكاوى ومتابعتها إلكترونيًا للعاملين بقطاع الكباري، دون الحاجة إلى إنشاء حساب.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/requests"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#f9580e] px-6 text-sm font-extrabold transition-all hover:bg-[#dd4807] hover:shadow-lg"
            >
              تقديم طلب جديد
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link
              href="/track"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/25 bg-white/8 px-6 text-sm font-bold backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              <Search className="h-4 w-4" />
              متابعة معاملة
            </Link>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-[11px] font-semibold text-white/60">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#ff7a3d]" /> سرية وحماية للبيانات</span>
            <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#ff7a3d]" /> متابعة على مدار الساعة</span>
          </div>
        </div>
      </section>

      <section className="enter-up-delay grid gap-5 lg:grid-cols-[1fr_1fr_.8fr]" aria-labelledby="services-title">
        <div className="lg:col-span-3">
          <span className="eyebrow">ابدأ معاملتك</span>
          <div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <h2 id="services-title" className="text-2xl font-extrabold text-[#20272d] sm:text-3xl">كل ما تحتاجه في مكان واحد</h2>
            <p className="text-xs text-slate-500">خطوات مختصرة، متابعة واضحة، وخصوصية مصممة للعاملين.</p>
          </div>
        </div>

        {serviceActions.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group surface-card relative min-h-64 overflow-hidden rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl sm:p-7"
            >
              <div className="absolute left-0 top-0 h-1 w-20 bg-[#f9580e] transition-all duration-300 group-hover:w-full" />
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#fff1e9] text-[#d94605] transition-colors group-hover:bg-[#f9580e] group-hover:text-white">
                <Icon className="h-6 w-6" />
              </div>
              <p className="mt-6 text-[11px] font-extrabold text-[#c63f00]">{item.label}</p>
              <h3 className="mt-1 text-xl font-extrabold text-[#20272d]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">{item.description}</p>
              <span className="mt-6 flex items-center gap-2 text-xs font-extrabold text-[#20272d]">
                {item.action}
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </span>
            </Link>
          );
        })}

        <Link
          href="/track"
          className="group relative min-h-64 overflow-hidden rounded-xl bg-[#f9580e] p-6 text-white shadow-[0_18px_40px_rgba(249,88,14,.22)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#df4907] sm:p-7"
        >
          <Search className="h-10 w-10 text-white/85" />
          <p className="mt-7 text-[11px] font-extrabold text-white/70">لديك معاملة بالفعل؟</p>
          <h3 className="mt-1 text-2xl font-extrabold">تابع حالتها الآن</h3>
          <p className="mt-3 text-sm leading-7 text-white/75">استخدم رقمك الثابت وكود المتابعة السري للاطلاع على آخر تحديث.</p>
          <span className="mt-6 flex items-center gap-2 text-xs font-extrabold">
            الانتقال للاستعلام
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </span>
        </Link>
      </section>

      <TrustedCasesList />
    </div>
  );
}
