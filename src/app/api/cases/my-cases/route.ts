import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/lib/services/case-service";
import {
  DEVICE_COOKIE_NAME,
  revokeDeviceToken,
  clearDeviceCookie,
} from "@/lib/device-token";

export async function GET(req: NextRequest) {
  const deviceToken = req.cookies.get(DEVICE_COOKIE_NAME)?.value;

  if (!deviceToken) {
    return NextResponse.json({ cases: [] });
  }

  const cases = await CaseService.getDeviceAuthorizedCases(deviceToken);
  return NextResponse.json({ cases });
}

export async function DELETE(req: NextRequest) {
  const deviceToken = req.cookies.get(DEVICE_COOKIE_NAME)?.value;

  if (deviceToken) {
    await revokeDeviceToken(deviceToken);
  }

  const response = NextResponse.json({ success: true });
  clearDeviceCookie(response);
  return response;
}
