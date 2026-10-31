import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

export class B2StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = env.B2_BUCKET_NAME;
    this.client = new S3Client({
      endpoint: env.B2_ENDPOINT,
      region: env.B2_REGION,
      credentials: {
        accessKeyId: env.B2_KEY_ID,
        secretAccessKey: env.B2_APPLICATION_KEY,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  async createUploadAuthorization(
    params: UploadAuthorizationParams
  ): Promise<UploadAuthorizationResult> {
    const usage = await this.getStorageUsage();
    if (usage.warningLevel === "exceeded") {
      throw new Error("تجاوزت سعة التخزين الحد المسموح به. يرجى التواصل مع إدارة النظام.");
    }

    // Do NOT pass ContentLength or ContentType to PutObjectCommand when presigning!
    // This ensures only the host header is signed, preventing signature mismatch
    // when browsers send chunked data or custom headers via fetch().
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
    });

    const expiresIn = params.expiresInSeconds || 900; // 15 minutes
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      uploadUrl,
      method: "PUT",
      headers: {
        "Content-Type": params.contentType,
      },
      key: params.key,
    };
  }

  async uploadDirect(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  private cachedUsage: { data: StorageUsageSummary; expiresAt: number } | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

  async verifyUploadedObject(key: string): Promise<ObjectMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.client.send(command, {
        abortSignal: AbortSignal.timeout(4000), // 4 seconds max to prevent freezing
      });

      return {
        exists: true,
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
      };
    } catch (error: any) {
      if (error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) {
        return { exists: false };
      }
      if (error?.name === "TimeoutError" || error?.name === "AbortError") {
        console.warn(`HeadObject timed out for key ${key}, assuming uploaded.`);
        return { exists: true };
      }
      throw error;
    }
  }

  async getAuthorizedDownloadUrl(
    key: string,
    originalFilename?: string,
    expiresInSeconds: number = 900
  ): Promise<string> {
    const filename = originalFilename || key.split("/").pop() || "file";
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });

    return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
    this.cachedUsage = null;
  }

  async getStorageUsage(forceRefresh: boolean = false): Promise<StorageUsageSummary> {
    if (!forceRefresh && this.cachedUsage && Date.now() < this.cachedUsage.expiresAt) {
      return this.cachedUsage.data;
    }

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

    const summary: StorageUsageSummary = {
      totalBytes,
      objectCount,
      softLimitMb: env.B2_SOFT_STORAGE_LIMIT_MB,
      usagePercentage,
      warningLevel,
    };

    this.cachedUsage = {
      data: summary,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };

    return summary;
  }
}
