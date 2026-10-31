import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/lib/services/case-service";
import { getOrCreateDeviceSession, setDeviceCookie } from "@/lib/device-token";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting by IP
    const ip = req.headers.get("x-forwarded-for") || "unknown-ip";
    const rateLimit = await checkRateLimit(`submit:${ip}`, 15, 60); // 15 submissions per minute per IP
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار قليلاً." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 2. Trusted device session
    const deviceSession = await getOrCreateDeviceSession(req);

    // 3. Submit case
    const result = await CaseService.submitCase({
      ...body,
      deviceId: deviceSession.id,
    });

    const response = NextResponse.json({
      success: true,
      case: result,
    });

    // 4. Attach/refresh device cookie
    setDeviceCookie(response, deviceSession.token);

    return response;
  } catch (error: any) {
    console.error("Case submission error:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء تسجيل الطلب. يرجى إعادة المحاولة." },
      { status: 400 }
    );
  }
}
