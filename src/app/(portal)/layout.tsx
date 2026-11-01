import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, ArrowUpLeft } from "lucide-react";

const navItems = [
  { href: "/", label: "الرئيسية" },
  { href: "/requests", label: "الطلبات" },
  { href: "/complaints", label: "الشكاوى والتظلمات" },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-shell min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#171d21]/95 text-white shadow-lg backdrop-blur-md">
        <div className="h-1 bg-[#f9580e]" />
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="الصفحة الرئيسية">
            <Image
              src="/brand/arab-contractors-logo.png"
              alt="شعار شركة المقاولون العرب"
              width={183}
              height={40}
              priority
              className="h-10 w-[183px] object-contain object-right"
            />
            <span className="hidden h-9 w-px bg-white/20 lg:block" />
            <span className="hidden lg:block">
              <span className="block text-sm font-bold">قطاع الكباري والإنشاءات التخصصية</span>
              <span className="mt-0.5 block text-[10px] text-white/55">بوابة خدمات العاملين</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="التنقل الرئيسي">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-xs font-bold text-white/75 transition-colors hover:bg-white/8 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/track"
              className="mr-2 inline-flex items-center gap-2 rounded-md bg-[#f9580e] px-4 py-2.5 text-xs font-extrabold text-white transition-colors hover:bg-[#dd4807]"
            >
              متابعة الشكوى
              <ArrowUpLeft className="h-4 w-4" />
            </Link>
          </nav>

          <details className="group relative md:hidden">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border border-white/15 bg-white/8 [&::-webkit-details-marker]:hidden">
              <Menu className="h-5 w-5 group-open:hidden" />
              <X className="hidden h-5 w-5 group-open:block" />
              <span className="sr-only">فتح قائمة التنقل</span>
            </summary>
            <nav className="absolute left-0 top-14 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-white/10 bg-[#20272d] p-2 shadow-2xl" aria-label="التنقل على الهاتف">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-4 py-3 text-sm font-bold text-white/80 transition-colors hover:bg-white/8 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/track"
                className="mt-1 flex items-center justify-between gap-2 rounded-md bg-[#f9580e] px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[#dd4807]"
              >
                متابعة الشكوى
                <ArrowUpLeft className="h-4 w-4" />
              </Link>
            </nav>
          </details>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-9 lg:px-8">
        {children}
      </main>

      <footer className="mt-auto border-t border-white/10 bg-[#171d21] text-white">
        <div className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-extrabold">المقاولون العرب</p>
            <p className="mt-1 text-xs text-white/55">قطاع الكباري والإنشاءات التخصصية — بوابة خدمات العاملين</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/65">
            <Link href="/privacy" className="transition-colors hover:text-[#ff7a3d]">سياسة الخصوصية</Link>
            <Link href="/track" className="transition-colors hover:text-[#ff7a3d]">متابعة المعاملات</Link>
            <span>جميع الحقوق محفوظة © 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
