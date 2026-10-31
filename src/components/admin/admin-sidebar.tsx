"use client";

import React from "react";
import Link from "next/link";
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
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "الرئيسية والإحصائيات", icon: LayoutDashboard },
  { href: "/admin/requests", label: "إدارة الطلبات", icon: FileText },
  { href: "/admin/complaints", label: "إدارة الشكاوى", icon: AlertOctagon },
  { href: "/admin/categories", label: "أنواع الطلبات والشكاوى", icon: FolderKanban },
  { href: "/admin/reports", label: "التقارير وتصدير Excel", icon: FileSpreadsheet },
  { href: "/admin/storage", label: "مساحة التخزين B2", icon: HardDrive },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Don't render sidebar on login page
  if (pathname === "/admin/login") {
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    router.push("/admin/login");
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-sm block">لوحة تحكم الإدارة</span>
          <span className="text-[11px] text-slate-400 block">إدارة الموارد البشرية</span>
        </div>
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
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                isActive
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors text-sm font-semibold cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
