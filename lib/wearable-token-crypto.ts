import crypto from "crypto";
import { requireServerEnv } from "@/config/env";

const ALGORITHM = "aes-256-gcm";

// Ensure the secret is exactly 32 bytes for AES-256
const getSecretKey = () => {
  const authSecret = requireServerEnv("authSecret");
  const key = Buffer.from(authSecret);
  if (key.length !== 32) {
    // Hash to 32 bytes if not exactly 32
    return crypto.createHash("sha256").update(authSecret).digest();
  }
  return key;
};

export function encryptToken(text: string): string {
  const iv = crypto.randomBytes(12); // 12 bytes recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Format: iv:authTag:encryptedText
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptToken(encryptedString: string): string {
  const parts = encryptedString.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encryptedText = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
