export interface UploadAuthorizationParams {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSeconds?: number;
}

export interface UploadAuthorizationResult {
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  key: string;
}

export interface ObjectMetadata {
  exists: boolean;
  size?: number;
  contentType?: string;
  lastModified?: Date;
}

export interface StorageUsageSummary {
  totalBytes: number;
  objectCount: number;
  softLimitMb: number;
  usagePercentage: number;
  warningLevel: "normal" | "warning_70" | "warning_85" | "critical_95" | "exceeded";
}

export interface IStorageProvider {
  /**
   * Generates a direct presigned PUT authorization URL for uploading an object.
   */
  createUploadAuthorization(
    params: UploadAuthorizationParams
  ): Promise<UploadAuthorizationResult>;

  /**
   * Verifies that the uploaded object exists in storage and returns its verified size and MIME type.
   */
  verifyUploadedObject(key: string): Promise<ObjectMetadata>;

  /**
   * Generates a temporary authorized download URL.
   */
  getAuthorizedDownloadUrl(
    key: string,
    originalFilename?: string,
    expiresInSeconds?: number
  ): Promise<string>;

  /**
   * Deletes an object from storage.
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Directly uploads an object (server-side stream/buffer).
   */
  uploadDirect(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void>;

  /**
   * Computes or estimates storage usage statistics (supports caching).
   */
  getStorageUsage(forceRefresh?: boolean): Promise<StorageUsageSummary>;
}
