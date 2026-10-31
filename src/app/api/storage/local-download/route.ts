import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { env } from "@/lib/env";

const UPLOADS_DIR = path.resolve(process.cwd(), ".uploads");

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const key = searchParams.get("key");
  const expires = searchParams.get("expires");
  const token = searchParams.get("token");
  const filename = searchParams.get("filename") || "download";

  if (!key || !expires || !token) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Check expiration
  const expireTimestamp = parseInt(expires, 10);
  if (Date.now() / 1000 > expireTimestamp) {
    return NextResponse.json({ error: "Download link expired" }, { status: 410 });
  }

  // Verify HMAC token
  const expectedToken = crypto
    .createHmac("sha256", env.TRACKING_SECRET_PEPPER)
    .update(`download:${key}:${expires}`)
    .digest("hex");

  if (token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized download" }, { status: 403 });
  }

  // Prevent path traversal
  const resolvedPath = path.resolve(UPLOADS_DIR, key);
  if (!resolvedPath.startsWith(UPLOADS_DIR)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  try {
    const fileBuffer = await fs.readFile(resolvedPath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Type": "application/octet-stream",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
