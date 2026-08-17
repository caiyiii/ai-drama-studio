import { Injectable } from "@nestjs/common";
import { resolveLocalAssetStorageRoot } from "./storage-root";
import {
  LocalAssetStorageProvider,
  type AssetStorageProvider,
  type SavedAssetFile,
} from "./local-asset-storage.provider";

@Injectable()
export class AssetStorageService {
  private readonly adapter: AssetStorageProvider;

  constructor() {
    this.adapter = new LocalAssetStorageProvider(resolveLocalAssetStorageRoot());
  }

  saveFromUrl(input: {
    projectId: string;
    assetId: string;
    url: string;
    mimeType?: string;
  }): Promise<SavedAssetFile> {
    return this.adapter.saveFromUrl(input);
  }

  saveFromBase64(input: {
    projectId: string;
    assetId: string;
    base64: string;
    mimeType?: string;
  }): Promise<SavedAssetFile> {
    return this.adapter.saveFromBase64(input);
  }

  delete(storageKey: string): Promise<void> {
    return this.adapter.delete(storageKey);
  }

  getUrl(projectId: string, assetId: string): string {
    return this.adapter.getUrl(projectId, assetId);
  }

  resolvePath(storageKey: string): string {
    return this.adapter.resolvePath(storageKey);
  }
}
