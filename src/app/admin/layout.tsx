import React from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import Link from "next/link";
import { ExternalLink, User } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session) {
    return <div className="min-h-screen w-full bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-100/70">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Admin Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">
              بوابة خدمات العاملين — لوحة تحكم الإدارة
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              عرض البوابة العامة
            </Link>

            <div className="flex items-center gap-2 border-r border-slate-200 pr-4 text-xs font-semibold text-slate-700">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <span className="hidden sm:inline">{session.user.name || "مدير الموارد البشرية"}</span>
            </div>
          </div>
        </header>

        {/* Full Width Main Content */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto w-full">{children}</main>
      </div>
    </div>
  );
}

