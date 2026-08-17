import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export class EncryptionKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionKeyError";
  }
}

export function resolveAesGcmKey(secret: string): Buffer {
  const trimmed = secret.trim();
  if (!trimmed) {
    throw new EncryptionKeyError("AI_ENCRYPTION_KEY is missing");
  }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  return createHash("sha256").update(trimmed).digest();
}

export function encryptSecret(plainText: string, secret: string): string {
  const key = resolveAesGcmKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return ["v1", "gcm", iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(
    ":",
  );
}

export function decryptSecret(payload: string, secret: string): string {
  const key = resolveAesGcmKey(secret);
  const tokens = payload.split(":");
  if (tokens.length !== 5 || tokens[0] !== "v1" || tokens[1] !== "gcm") {
    throw new EncryptionKeyError("Stored API Key payload is invalid");
  }
  const iv = Buffer.from(tokens[2], "base64");
  const tag = Buffer.from(tokens[3], "base64");
  const data = Buffer.from(tokens[4], "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
