import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  IStorageProvider,
  ObjectMetadata,
  StorageUsageSummary,
  UploadAuthorizationParams,
  UploadAuthorizationResult,
} from "./types";
import { env } from "../env";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { sql } from "drizzle-orm";

const UPLOADS_DIR = path.resolve(process.cwd(), ".uploads");

export class LocalStorageProvider implements IStorageProvider {
  private async ensureUploadDir(subPath?: string): Promise<string> {
    const targetDir = subPath ? path.dirname(path.join(UPLOADS_DIR, subPath)) : UPLOADS_DIR;
    await fs.mkdir(targetDir, { recursive: true });
    return targetDir;
  }

  async createUploadAuthorization(
    params: UploadAuthorizationParams
  ): Promise<UploadAuthorizationResult> {
    await this.ensureUploadDir(params.key);

    const token = crypto
      .createHmac("sha256", env.TRACKING_SECRET_PEPPER)
      .update(`upload:${params.key}`)
      .digest("hex");

    const baseUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const uploadUrl = `${baseUrl}/api/storage/local-upload?key=${encodeURIComponent(
      params.key
    )}&token=${token}`;

    return {
      uploadUrl,
      method: "PUT",
      headers: {
        "Content-Type": params.contentType,
      },
      key: params.key,
    };
  }

  async verifyUploadedObject(key: string): Promise<ObjectMetadata> {
    try {
      const filePath = path.join(UPLOADS_DIR, key);
      const stat = await fs.stat(filePath);
      return {
        exists: true,
        size: stat.size,
        lastModified: stat.mtime,
      };
    } catch {
      return { exists: false };
    }
  }

  async getAuthorizedDownloadUrl(
    key: string,
    originalFilename?: string,
    expiresInSeconds: number = 900
  ): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const token = crypto
      .createHmac("sha256", env.TRACKING_SECRET_PEPPER)
      .update(`download:${key}:${expires}`)
      .digest("hex");

    const baseUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/api/storage/local-download?key=${encodeURIComponent(
      key
    )}&expires=${expires}&token=${token}&filename=${encodeURIComponent(originalFilename || "file")}`;
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const filePath = path.join(UPLOADS_DIR, key);
      await fs.unlink(filePath);
    } catch {
      // Ignore if already deleted
    }
  }

  async getStorageUsage(): Promise<StorageUsageSummary> {
    const [result] = await db
      .select({
        totalBytes: sql<number>`COALESCE(SUM(${attachments.file_size}), 0)::bigint`,
        objectCount: sql<number>`COUNT(${attachments.id})::integer`,
      })
      .from(attachments);

    const totalBytes = Number(result?.totalBytes || 0);
    const objectCount = Number(result?.objectCount || 0);
    const softLimitBytes = env.B2_SOFT_STORAGE_LIMIT_MB * 1024 * 1024;
    const usagePercentage = Math.min(100, Math.round((totalBytes / softLimitBytes) * 100));

    let warningLevel: StorageUsageSummary["warningLevel"] = "normal";
    if (usagePercentage >= 100) {
      warningLevel = "exceeded";
    } else if (usagePercentage >= 95) {
      warningLevel = "critical_95";
    } else if (usagePercentage >= 85) {
      warningLevel = "warning_85";
    } else if (usagePercentage >= 70) {
      warningLevel = "warning_70";
    }

    return {
      totalBytes,
      objectCount,
      softLimitMb: env.B2_SOFT_STORAGE_LIMIT_MB,
      usagePercentage,
      warningLevel,
    };
  }
}
