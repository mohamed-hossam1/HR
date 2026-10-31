import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cases, trusted_devices, trusted_device_cases } from "@/db/schema";
import { hashDeviceToken, generateSecureToken } from "./crypto";
import { eq, and, gt } from "drizzle-orm";

export const DEVICE_COOKIE_NAME = "es_device_token";
export const DEVICE_COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

export interface DeviceSession {
  id: string;
  token: string;
  isNew: boolean;
}

/**
 * Retrieves existing active device session or creates a new one.
 */
export async function getOrCreateDeviceSession(
  req: NextRequest,
  userAgent?: string,
  ipAddress?: string
): Promise<DeviceSession> {
  const existingCookie = req.cookies.get(DEVICE_COOKIE_NAME)?.value;

  if (existingCookie && existingCookie.length >= 32) {
    const tokenHash = hashDeviceToken(existingCookie);
    const [device] = await db
      .select()
      .from(trusted_devices)
      .where(
        and(
          eq(trusted_devices.device_token_hash, tokenHash),
          eq(trusted_devices.is_revoked, false),
          gt(trusted_devices.expires_at, new Date())
        )
      )
      .limit(1);

    if (device) {
      // Update last used timestamp
      await db
        .update(trusted_devices)
        .set({ last_used_at: new Date() })
        .where(eq(trusted_devices.id, device.id));

      return {
        id: device.id,
        token: existingCookie,
        isNew: false,
      };
    }
  }

  // Create new trusted device session
  const token = generateSecureToken(32);
  const tokenHash = hashDeviceToken(token);
  const expiresAt = new Date(Date.now() + DEVICE_COOKIE_MAX_AGE * 1000);

  const [newDevice] = await db
    .insert(trusted_devices)
    .values({
      device_token_hash: tokenHash,
      user_agent: userAgent || req.headers.get("user-agent") || null,
      ip_address: ipAddress || req.headers.get("x-forwarded-for") || null,
      expires_at: expiresAt,
      is_revoked: false,
    })
    .returning();

  return {
    id: newDevice.id,
    token,
    isNew: true,
  };
}

/**
 * Associates a case with a trusted device.
 */
export async function linkCaseToDevice(deviceId: string, caseId: string): Promise<void> {
  try {
    await db
      .insert(trusted_device_cases)
      .values({
        device_id: deviceId,
        case_id: caseId,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error("Failed to link case to device:", error);
  }
}

/**
 * Checks whether a given device token has authorized access to a specific case.
 */
export async function isDeviceAuthorizedForCase(
  deviceToken: string | undefined,
  caseIdOrReference: string
): Promise<boolean> {
  if (!deviceToken || !caseIdOrReference) return false;

  let resolvedCaseId = caseIdOrReference;
  // If a public reference like REQ-2026-000001 was passed instead of a UUID
  if (caseIdOrReference.startsWith("REQ-") || caseIdOrReference.startsWith("CMP-")) {
    const [c] = await db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.reference, caseIdOrReference))
      .limit(1);
    if (!c) return false;
    resolvedCaseId = c.id;
  }

  const tokenHash = hashDeviceToken(deviceToken);
  const [device] = await db
    .select({ deviceId: trusted_devices.id })
    .from(trusted_devices)
    .where(
      and(
        eq(trusted_devices.device_token_hash, tokenHash),
        eq(trusted_devices.is_revoked, false),
        gt(trusted_devices.expires_at, new Date())
      )
    )
    .limit(1);

  if (!device) return false;

  const [mapping] = await db
    .select()
    .from(trusted_device_cases)
    .where(
      and(
        eq(trusted_device_cases.device_id, device.deviceId),
        eq(trusted_device_cases.case_id, resolvedCaseId)
      )
    )
    .limit(1);

  return Boolean(mapping);
}

/**
 * Revokes an existing trusted device session.
 */
export async function revokeDeviceToken(token: string): Promise<void> {
  const tokenHash = hashDeviceToken(token);
  await db
    .update(trusted_devices)
    .set({ is_revoked: true })
    .where(eq(trusted_devices.device_token_hash, tokenHash));
}

/**
 * Sets the HttpOnly device cookie on a response.
 */
export function setDeviceCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: DEVICE_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
}

/**
 * Clears the device cookie on a response.
 */
export function clearDeviceCookie(res: NextResponse): void {
  res.cookies.set({
    name: DEVICE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
