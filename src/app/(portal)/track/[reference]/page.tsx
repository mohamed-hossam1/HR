import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CaseService } from "@/lib/services/case-service";
import { DEVICE_COOKIE_NAME, isDeviceAuthorizedForCase } from "@/lib/device-token";
import { auth } from "@/lib/auth";
import { CaseTrackingView } from "@/components/tracking/case-tracking-view";
import Link from "next/link";
import { ShieldAlert, KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";


interface PageProps {
  params: Promise<{ reference: string }>;
}

export default async function TrackDetailPage({ params }: PageProps) {
  const { reference } = await params;

  const [caseRecord] = await db
    .select()
    .from(cases)
    .where(eq(cases.reference, reference.trim()))
    .limit(1);

  if (!caseRecord) {
    notFound();
  }

  // Check HR session first
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  const isManager = Boolean(session);

  // Check trusted device cookie
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
  const isDeviceAuthorized = await isDeviceAuthorizedForCase(deviceToken, caseRecord.id);

  if (!isManager && !isDeviceAuthorized) {
    // Unauthorized device: require tracking code
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">يلزم التحقق من الصلاحية</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            هذا الجهاز غير مسجل كجهاز مصرح له بالاطلاع على المعاملة رقم{" "}
            <span className="font-mono font-bold text-slate-900">{reference}</span>.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-right space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <KeyRound className="w-4 h-4 text-blue-900" />
            <span>كيفية الوصول لهذه المعاملة:</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            يرجى الانتقال إلى صفحة الاستعلام وإدخال <strong>الرقم الثابت</strong> مع{" "}
            <strong>كود المتابعة السري</strong> الذي حصلت عليه عند تقديم المعاملة، وسيتم حفظ هذا الجهاز
            تلقائياً للمرات القادمة.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <Link
            href="/track"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-900 text-white font-semibold text-sm hover:bg-blue-800 transition-colors shadow-xs"
          >
            الانتقال لصفحة إدخال كود المتابعة
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  // Load authorized case data
  const caseData = await CaseService.buildAuthorizedCaseView(caseRecord, isManager);

  return <CaseTrackingView caseData={caseData} />;
}
