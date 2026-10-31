import crypto from "crypto";
import { env } from "./env";

/**
 * Computes an HMAC-SHA256 hash of a tracking code using the server-side pepper.
 */
export function hashTrackingCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  return crypto
    .createHmac("sha256", env.TRACKING_SECRET_PEPPER)
    .update(normalized)
    .digest("hex");
}

/**
 * Verifies a tracking code against a stored HMAC hash in constant time.
 */
export function verifyTrackingCode(providedCode: string, storedHash: string): boolean {
  try {
    const computedHash = hashTrackingCode(providedCode);
    const a = Buffer.from(computedHash, "hex");
    const b = Buffer.from(storedHash, "hex");
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Computes a standard SHA-256 hash (e.g. for device tokens).
 */
export function hashDeviceToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a cryptographically secure opaque token (default 32 bytes hex).
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Generates an easy-to-read high-entropy tracking code (e.g. 16 uppercase chars formatted in 4 blocks).
 * Uses unambiguous characters (excluding 0/O, 1/I/L).
 */
export function generateTrackingCode(): string {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const bytes = crypto.randomBytes(16);
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return `${result.slice(0, 4)}-${result.slice(4, 8)}-${result.slice(8, 12)}-${result.slice(12, 16)}`;
}

/**
 * Derives a 32-byte key from the configured encryption key.
 */
function getEncryptionKey(): Buffer {
  return crypto.createHash("sha256").update(env.SENSITIVE_DATA_ENCRYPTION_KEY).digest();
}

/**
 * Encrypts sensitive data (e.g., National ID) using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (hex encoded).
 */
export function encryptSensitiveData(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted data.
 */
export function decryptSensitiveData(encryptedData: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
