import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/lib/services/case-service";
import { getOrCreateDeviceSession, setDeviceCookie } from "@/lib/device-token";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const trackRequestSchema = z.object({
  employee_number: z.string().trim().min(1, "الرقم الثابت مطلوب"),
  tracking_code: z.string().trim().min(5, "كود المتابعة غير صحيح"),
  remember_device: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";

    // 1. Strict rate limit on tracking attempts: 5 per minute per IP
    const rateLimit = await checkRateLimit(`track:${ip}`, 5, 60);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `تم تجاوز الحد المسموح من محاولات الاستعلام. يرجى الانتظار لمدة ${rateLimit.resetInSeconds} ثانية قبل المحاولة مجدداً.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = trackRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "بيانات غير مكتملة", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { employee_number, tracking_code, remember_device } = parsed.data;

    // 2. Device session
    const deviceSession = await getOrCreateDeviceSession(req);

    // 3. Authenticate case using credentials
    const caseDetails = await CaseService.trackCaseByCredentials(
      employee_number,
      tracking_code,
      remember_device ? deviceSession.id : undefined
    );

    if (!caseDetails) {
      return NextResponse.json(
        {
          error:
            "لم يتم العثور على أي معاملة مطابقة للرقم الثابت وكود المتابعة المدخل. تأكد من صحة البيانات أو تواصل مع إدارة الموارد البشرية.",
        },
        { status: 404 }
      );
    }

    // 4. Save reference in LocalStorage metadata index on client
    const response = NextResponse.json({
      success: true,
      reference: caseDetails.reference,
      caseDetails,
    });

    if (remember_device) {
      setDeviceCookie(response, deviceSession.token);
    }

    return response;
  } catch (error: any) {
    console.error("Tracking query error:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء الاستعلام عن المعاملة." },
      { status: 500 }
    );
  }
}
