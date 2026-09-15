import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

// ENCRYPTION_KEY: base64-encoded 32-byte key from .env
const key = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "base64");

if (key.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be a base64-encoded 32-byte key");
}

const ALGO = "aes-256-gcm";

/** Encrypt plaintext → base64(iv + authTag + ciphertext). */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/** Decrypt base64(iv + authTag + ciphertext) → plaintext. */
export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Deterministic HMAC-SHA256 of an email (lowercased + trimmed) — used as Debtor PK. */
export function emailHash(email: string): string {
  return createHmac("sha256", key).update(email.trim().toLowerCase()).digest("hex");
}

/** Random opaque slug for public debtor URLs. */
export function generateSlug(): string {
  return randomBytes(16).toString("hex");
}