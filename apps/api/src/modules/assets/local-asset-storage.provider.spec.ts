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

    const music = await storage.saveFromBase64({
      projectId: "proj-1",
      assetId: "asset-music",
      base64: Buffer.from("RIFF").toString("base64"),
      mimeType: "audio/mpeg",
      fileStem: "music",
    });
    expect(music.storageKey).toBe("assets/proj-1/asset-music/music.mp3");
    const copied = await storage.copy({
      sourceStorageKey: music.storageKey,
      projectId: "proj-1",
      assetId: "asset-music-copy",
      mimeType: "audio/mpeg",
      fileStem: "music",
    });
    expect(copied.storageKey).toBe("assets/proj-1/asset-music-copy/music.mp3");
    await storage.delete(music.storageKey);
    await storage.delete(copied.storageKey);

    const renderSource = path.join(root, "episode-src.mp4");
    await fs.writeFile(renderSource, Buffer.from("fake-mp4"));
    const rendered = await storage.saveFromFile({
      storageKey: "renders/proj-1/ep-1/job-1/episode.mp4",
      sourcePath: renderSource,
      mimeType: "video/mp4",
    });
    expect(rendered.storageKey).toBe("renders/proj-1/ep-1/job-1/episode.mp4");
    expect(rendered.sizeBytes).toBeGreaterThan(0);
    await storage.delete(rendered.storageKey);
  });
});
