import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, resolveAesGcmKey } from "./aes-gcm";

const KEY = "a".repeat(64);

describe("AES-256-GCM API Key encryption", () => {
  it("encrypts and decrypts an API key", () => {
    const encrypted = encryptSecret("sk-live-secret", KEY);
    expect(encrypted.startsWith("v1:gcm:")).toBe(true);
    expect(encrypted).not.toContain("sk-live-secret");
    expect(decryptSecret(encrypted, KEY)).toBe("sk-live-secret");
  });

  it("produces a 32-byte key from hex", () => {
    expect(resolveAesGcmKey(KEY)).toHaveLength(32);
  });

  it("fails to decrypt with the wrong key", () => {
    const encrypted = encryptSecret("sk-live-secret", KEY);
    expect(() => decryptSecret(encrypted, "b".repeat(64))).toThrow();
  });
});
