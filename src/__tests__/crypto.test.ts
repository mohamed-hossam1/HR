import { describe, it, expect } from "vitest";
import {
  hashTrackingCode,
  verifyTrackingCode,
  encryptSensitiveData,
  decryptSensitiveData,
  generateTrackingCode,
  generateSecureToken,
  hashDeviceToken,
} from "@/lib/crypto";

describe("Crypto utilities", () => {
  it("generates a well-formatted 16-character tracking code in 4 blocks", () => {
    const code = generateTrackingCode();
    expect(code).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  });

  it("hashes and correctly verifies tracking codes", () => {
    const code = generateTrackingCode();
    const hash = hashTrackingCode(code);

    expect(verifyTrackingCode(code, hash)).toBe(true);
    expect(verifyTrackingCode(code.toLowerCase(), hash)).toBe(true); // Case-insensitive
    expect(verifyTrackingCode("WRONG-CODE-1234", hash)).toBe(false);
  });

  it("encrypts and decrypts sensitive data using AES-256-GCM", () => {
    const nationalId = "29501011234567";
    const encrypted = encryptSensitiveData(nationalId);

    expect(encrypted).not.toContain(nationalId);
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decryptSensitiveData(encrypted);
    expect(decrypted).toBe(nationalId);
  });

  it("fails decryption when ciphertext is tampered with", () => {
    const encrypted = encryptSensitiveData("secret-data");
    const parts = encrypted.split(":");
    // Tamper with the ciphertext
    const tampered = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`;

    expect(() => decryptSensitiveData(tampered)).toThrow();
  });

  it("generates secure random opaque tokens and consistent device hashes", () => {
    const token = generateSecureToken(32);
    expect(token).toHaveLength(64); // 32 bytes hex = 64 chars

    const hash1 = hashDeviceToken(token);
    const hash2 = hashDeviceToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});
