import React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold shadow-sm">
              <FileText className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">
                بوابة خدمات العاملين
              </h1>
              <p className="text-xs text-slate-500">Employee Services Portal</p>
            </div>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4 text-sm font-medium">
            <Link
              href="/requests"
              className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-blue-900 hover:bg-slate-100 transition-colors"
            >
              الطلبات
            </Link>
            <Link
              href="/complaints"
              className="px-3 py-1.5 rounded-lg text-slate-700 hover:text-blue-900 hover:bg-slate-100 transition-colors"
            >
              الشكاوى
            </Link>
            <Link
              href="/track"
              className="px-3 py-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold transition-colors"
            >
              استعلام ومتابعة
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 بوابة خدمات العاملين. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:underline text-slate-600">
              سياسة الخصوصية وحماية البيانات
            </Link>
            <Link href="/track" className="hover:underline text-slate-600">
              متابعة الطلبات السابقة
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
