import fs from "node:fs/promises";
import path from "node:path";

export interface SavedAssetFile {
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AssetStorageProvider {
  saveFromUrl(input: {
    projectId: string;
    assetId: string;
    url: string;
    mimeType?: string;
  }): Promise<SavedAssetFile>;
  saveFromBase64(input: {
    projectId: string;
    assetId: string;
    base64: string;
    mimeType?: string;
  }): Promise<SavedAssetFile>;
  delete(storageKey: string): Promise<void>;
  getUrl(projectId: string, assetId: string): string;
  resolvePath(storageKey: string): string;
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export class LocalAssetStorageProvider implements AssetStorageProvider {
  constructor(private readonly rootDir: string) {}

  getUrl(projectId: string, assetId: string): string {
    return `/projects/${projectId}/assets/${assetId}/file`;
  }

  resolvePath(storageKey: string): string {
    const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
    const full = path.resolve(this.rootDir, normalized);
    const root = path.resolve(this.rootDir);
    if (full !== root && !full.startsWith(root + path.sep)) {
      throw new Error("Invalid storage key");
    }
    return full;
  }

  async saveFromBase64(input: {
    projectId: string;
    assetId: string;
    base64: string;
    mimeType?: string;
  }): Promise<SavedAssetFile> {
    const mimeType = input.mimeType || "image/png";
    const buffer = Buffer.from(stripDataUrl(input.base64), "base64");
    return this.write(input.projectId, input.assetId, buffer, mimeType);
  }

  async saveFromUrl(input: {
    projectId: string;
    assetId: string;
    url: string;
    mimeType?: string;
  }): Promise<SavedAssetFile> {
    let response: Response;
    try {
      response = await fetch(input.url, { signal: AbortSignal.timeout(60_000) });
    } catch {
      throw new Error("IMAGE_ASSET_SAVE_FAILED");
    }
    if (!response.ok) {
      throw new Error("IMAGE_ASSET_SAVE_FAILED");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType =
      input.mimeType ||
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      "image/png";
    return this.write(input.projectId, input.assetId, buffer, mimeType);
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await fs.unlink(this.resolvePath(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  private async write(
    projectId: string,
    assetId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<SavedAssetFile> {
    const ext =
      MIME_EXT[mimeType] ||
      (mimeType.startsWith("video/") ? "mp4" : "png");
    const filename = mimeType.startsWith("video/") ? `video.${ext}` : `original.${ext}`;
    const storageKey = `assets/${projectId}/${assetId}/${filename}`;
    const full = this.resolvePath(storageKey);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
    return {
      storageKey,
      url: this.getUrl(projectId, assetId),
      mimeType,
      sizeBytes: buffer.byteLength,
    };
  }
}

function stripDataUrl(value: string): string {
  const match = value.match(/^data:[^;]+;base64,(.+)$/);
  return match?.[1] ?? value;
}

export class S3AssetStorageProvider implements AssetStorageProvider {
  saveFromUrl(): Promise<SavedAssetFile> {
    return Promise.reject(new Error("S3 storage is not implemented"));
  }
  saveFromBase64(): Promise<SavedAssetFile> {
    return Promise.reject(new Error("S3 storage is not implemented"));
  }
  delete(): Promise<void> {
    return Promise.reject(new Error("S3 storage is not implemented"));
  }
  getUrl(): string {
    throw new Error("S3 storage is not implemented");
  }
  resolvePath(): string {
    throw new Error("S3 storage is not implemented");
  }
}

export class R2AssetStorageProvider extends S3AssetStorageProvider {}
export class OSSAssetStorageProvider extends S3AssetStorageProvider {}
