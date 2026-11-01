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
    return <div className="min-h-screen w-full bg-[#f5f4f1]">{children}</div>;
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f5f4f1]">
      <AdminSidebar />
      <div className="flex min-w-0 w-full flex-1 flex-col">
        {/* Admin Top Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#20272d]/95 pr-16 pl-3 text-white shadow-sm backdrop-blur-md sm:px-8">
          <div className="hidden items-center gap-3 sm:flex">
            <span className="h-8 w-1 rounded-full bg-[#f9580e]" aria-hidden="true" />
            <div>
              <span className="block text-xs font-extrabold">المقاولون العرب</span>
              <span className="mt-0.5 block text-[10px] text-white/45">إدارة قطاع الكباري</span>
            </div>
          </div>

          <div className="mr-auto flex items-center gap-2 sm:mr-0 sm:gap-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/6 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 transition-colors hover:border-[#f9580e]/50 hover:bg-[#f9580e] hover:text-white sm:px-3 sm:text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              عرض البوابة العامة
            </Link>

            <div className="flex items-center gap-2 border-r border-white/15 pr-4 text-xs font-semibold text-white/80">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f9580e] font-bold text-white shadow-[0_4px_14px_rgba(249,88,14,0.28)]">
                <User className="w-4 h-4" />
              </div>
              <span className="hidden lg:inline">{session.user.name || "مدير خدمات العاملين"}</span>
            </div>
          </div>
        </header>

        {/* Full Width Main Content */}
        <main className="min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

