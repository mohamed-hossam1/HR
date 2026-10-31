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

  it("returns storage usage statistics with soft limit comparison", async () => {
    const provider = getStorageProvider();
    const usage = await provider.getStorageUsage();

    expect(usage).toBeDefined();
    expect(typeof usage.totalBytes).toBe("number");
    expect(typeof usage.objectCount).toBe("number");
    expect(["normal", "warning_70", "warning_85", "critical_95", "exceeded"]).toContain(
      usage.warningLevel
    );
  });
});
