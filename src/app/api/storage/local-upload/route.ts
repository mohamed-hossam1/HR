import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { env } from "@/lib/env";

const UPLOADS_DIR = path.resolve(process.cwd(), ".uploads");

export async function PUT(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const key = searchParams.get("key");
  const token = searchParams.get("token");

  if (!key || !token) {
    return NextResponse.json({ error: "Missing key or token" }, { status: 400 });
  }

  // Verify HMAC token
  const expectedToken = crypto
    .createHmac("sha256", env.TRACKING_SECRET_PEPPER)
    .update(`upload:${key}`)
    .digest("hex");

  if (token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized upload" }, { status: 403 });
  }

  // Prevent path traversal
  const resolvedPath = path.resolve(UPLOADS_DIR, key);
  if (!resolvedPath.startsWith(UPLOADS_DIR)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  const arrayBuffer = await req.arrayBuffer();
  await fs.writeFile(resolvedPath, Buffer.from(arrayBuffer));

  return new NextResponse(null, { status: 200 });
}
