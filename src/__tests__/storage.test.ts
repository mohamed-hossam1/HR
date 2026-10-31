import { describe, it, expect, afterAll } from "vitest";
import { getStorageProvider } from "@/lib/storage";
import { pool } from "@/db";

describe("StorageProvider", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("instantiates an IStorageProvider instance", () => {
    const provider = getStorageProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.createUploadAuthorization).toBe("function");
    expect(typeof provider.verifyUploadedObject).toBe("function");
    expect(typeof provider.getAuthorizedDownloadUrl).toBe("function");
  });

  it("creates an upload authorization with PUT method and headers", async () => {
    const provider = getStorageProvider();
    const result = await provider.createUploadAuthorization({
      key: "test-uploads/sample.jpg",
      contentType: "image/jpeg",
      contentLength: 1024,
    });

    expect(result.method).toBe("PUT");
    expect(result.uploadUrl).toBeDefined();
    expect(result.headers["Content-Type"]).toBe("image/jpeg");
    expect(result.key).toBe("test-uploads/sample.jpg");
  });

  it("generates an authorized download url", async () => {
    const provider = getStorageProvider();
    const downloadUrl = await provider.getAuthorizedDownloadUrl(
      "test-uploads/sample.jpg",
      "my-document.jpg",
      300
    );

    expect(downloadUrl).toBeDefined();
    expect(downloadUrl).toContain("my-document.jpg");
  });

  it("returns storage usage statistics with soft limit comparison and caches result", async () => {
    const provider = getStorageProvider();
    const t0 = Date.now();
    const usage = await provider.getStorageUsage();
    const elapsedFirst = Date.now() - t0;

    expect(usage).toBeDefined();
    expect(typeof usage.totalBytes).toBe("number");
    expect(typeof usage.objectCount).toBe("number");
    expect(["normal", "warning_70", "warning_85", "critical_95", "exceeded"]).toContain(
      usage.warningLevel
    );

    // Second call should return cached data instantly
    const t1 = Date.now();
    const cachedUsage = await provider.getStorageUsage();
    const elapsedSecond = Date.now() - t1;

    expect(cachedUsage).toEqual(usage);
    expect(elapsedSecond).toBeLessThanOrEqual(elapsedFirst);

    // forceRefresh should also return valid usage
    const refreshed = await provider.getStorageUsage(true);
    expect(refreshed.totalBytes).toBe(usage.totalBytes);
  });

  it("directly uploads, verifies, and deletes an object", async () => {
    const provider = getStorageProvider();
    const testKey = `test-unit/${Date.now()}-direct.txt`;
    const content = Buffer.from("direct upload content");

    await provider.uploadDirect(testKey, content, "text/plain");
    const meta = await provider.verifyUploadedObject(testKey);

    expect(meta.exists).toBe(true);
    expect(meta.size).toBe(content.length);

    await provider.deleteObject(testKey);
    const afterDelete = await provider.verifyUploadedObject(testKey);
    expect(afterDelete.exists).toBe(false);
  });
});
