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
    });
  }

  async createUploadAuthorization(
    params: UploadAuthorizationParams
  ): Promise<UploadAuthorizationResult> {
    const usage = await this.getStorageUsage();
    if (usage.warningLevel === "exceeded") {
      throw new Error("تجاوزت سعة التخزين الحد المسموح به. يرجى التواصل مع إدارة النظام.");
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
      ContentLength: params.contentLength,
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

  async verifyUploadedObject(key: string): Promise<ObjectMetadata> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.client.send(command);

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
