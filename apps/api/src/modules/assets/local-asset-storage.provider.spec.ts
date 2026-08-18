import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LocalAssetStorageProvider } from "./local-asset-storage.provider";

describe("LocalAssetStorageProvider", () => {
  it("saves base64 and rejects path traversal", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ads-assets-"));
    const storage = new LocalAssetStorageProvider(root);
    const saved = await storage.saveFromBase64({
      projectId: "proj-1",
      assetId: "asset-1",
      base64:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      mimeType: "image/png",
    });
    expect(saved.storageKey).toBe("assets/proj-1/asset-1/original.png");
    expect(saved.url).toBe("/projects/proj-1/assets/asset-1/file");
    const full = storage.resolvePath(saved.storageKey);
    await expect(fs.stat(full)).resolves.toBeTruthy();
    expect(() => storage.resolvePath("../secret.txt")).toThrow();
    await storage.delete(saved.storageKey);

    const audio = await storage.saveFromBase64({
      projectId: "proj-1",
      assetId: "asset-audio",
      base64: Buffer.from("RIFF").toString("base64"),
      mimeType: "audio/mpeg",
    });
    expect(audio.storageKey).toBe("assets/proj-1/asset-audio/audio.mp3");
    await storage.delete(audio.storageKey);
  });
});
