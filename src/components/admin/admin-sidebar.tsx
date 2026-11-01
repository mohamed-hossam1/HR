"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import {
  LayoutDashboard,
  FileText,
  AlertOctagon,
  FolderKanban,
  FileSpreadsheet,
  HardDrive,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "الرئيسية والإحصائيات", icon: LayoutDashboard },
  { href: "/admin/requests", label: "إدارة الطلبات", icon: FileText },
  { href: "/admin/complaints", label: "إدارة الشكاوى", icon: AlertOctagon },
  { href: "/admin/categories", label: "أنواع الطلبات والشكاوى", icon: FolderKanban },
  { href: "/admin/reports", label: "التقارير وتصدير البيانات", icon: FileSpreadsheet },
  { href: "/admin/storage", label: "إدارة مساحة التخزين", icon: HardDrive },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Don't render sidebar on login page
  if (pathname === "/admin/login") {
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    router.push("/admin/login");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="fixed right-3 top-3 z-[60] flex h-10 w-10 items-center justify-center rounded-md bg-[#20272d] text-white shadow-lg md:hidden"
        aria-label={isOpen ? "إغلاق قائمة الإدارة" : "فتح قائمة الإدارة"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {isOpen && (
        <button
          type="button"
          aria-label="إغلاق قائمة الإدارة"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] md:hidden"
        />
      )}
      <aside className={`fixed inset-y-0 right-0 z-50 flex h-screen w-72 shrink-0 flex-col overflow-y-auto border-t-[3px] border-[#f9580e] bg-[#171d21] text-white shadow-2xl transition-transform duration-300 md:sticky md:top-0 md:w-64 md:translate-x-0 md:shadow-none ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
      {/* Brand Header */}
      <div className="border-b border-white/10 px-5 py-6 pl-14 md:pl-5">
        <Image
          src="/brand/arab-contractors-logo.png"
          alt="المقاولون العرب"
          width={183}
          height={40}
          priority
          className="h-10 w-auto max-w-full object-contain object-right"
        />
        <div className="mt-4 flex items-center gap-2">
          <span className="h-px w-7 bg-[#f9580e]" aria-hidden="true" />
          <span className="text-[10px] font-bold tracking-wide text-white/80">
            قطاع الكباري والإنشاءات التخصصية
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-white/45">نظام خدمات العاملين</p>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-4 space-y-1 text-sm font-medium">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`relative flex items-center gap-3 rounded-lg px-3.5 py-3 transition-colors ${
                isActive
                  ? "bg-[#f9580e] font-semibold text-white shadow-[0_8px_24px_rgba(249,88,14,0.22)]"
                  : "text-white/65 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-white/10">
        <p className="mb-3 px-3.5 text-[10px] leading-5 text-white/35">
          إدارة الموارد البشرية<br />شركة المقاولون العرب
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors text-sm font-semibold cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
      </aside>
    </>
  );
}
