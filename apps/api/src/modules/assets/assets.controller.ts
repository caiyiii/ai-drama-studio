import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { AssetType, AudioAssetRole } from "@prisma/client";
import { AssetsService } from "./assets.service";

@Controller("projects/:projectId")
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get("assets")
  list(
    @Param("projectId") projectId: string,
    @Query("type") type?: AssetType,
  ) {
    return this.assets.list(projectId, type);
  }

  @Get("assets/:assetId")
  get(
    @Param("projectId") projectId: string,
    @Param("assetId") assetId: string,
  ) {
    return this.assets.get(projectId, assetId);
  }

  @Get("assets/:assetId/file")
  getFile(
    @Param("projectId") projectId: string,
    @Param("assetId") assetId: string,
  ) {
    return this.assets.getFile(projectId, assetId);
  }

  @Get("episodes/:episodeId/storyboard/shots/:shotId/assets")
  listShotAssets(
    @Param("projectId") projectId: string,
    @Param("shotId") shotId: string,
    @Query("type") type?: AssetType,
  ) {
    return this.assets.listShotAssets(projectId, shotId, type);
  }

  @Post("episodes/:episodeId/storyboard/shots/:shotId/assets/:assetId/primary")
  setPrimary(
    @Param("projectId") projectId: string,
    @Param("shotId") shotId: string,
    @Param("assetId") assetId: string,
  ) {
    return this.assets.setPrimaryShotAsset(projectId, shotId, assetId);
  }

  @Get("script-blocks/:scriptBlockId/assets")
  listScriptBlockAssets(
    @Param("projectId") projectId: string,
    @Param("scriptBlockId") scriptBlockId: string,
  ) {
    return this.assets.listScriptBlockAssets(projectId, scriptBlockId);
  }

  @Post("script-blocks/:scriptBlockId/assets/:assetId/primary")
  setPrimaryScriptBlockAsset(
    @Param("projectId") projectId: string,
    @Param("scriptBlockId") scriptBlockId: string,
    @Param("assetId") assetId: string,
  ) {
    return this.assets.setPrimaryScriptBlockAsset(projectId, scriptBlockId, assetId);
  }

  @Get("audio-assets")
  listProjectAudioAssets(
    @Param("projectId") projectId: string,
    @Query("role") role?: AudioAssetRole,
  ) {
    return this.assets.listEpisodeAudioAssets(projectId, undefined, role);
  }

  @Get("episodes/:episodeId/audio-assets")
  listEpisodeAudioAssets(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Query("role") role?: AudioAssetRole,
  ) {
    return this.assets.listEpisodeAudioAssets(projectId, episodeId, role);
  }

  @Post("episodes/:episodeId/audio-assets/:assetId/primary")
  setPrimaryEpisodeAudioAsset(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("assetId") assetId: string,
    @Query("role") role?: AudioAssetRole,
  ) {
    return this.assets.setPrimaryEpisodeAudioAsset(projectId, episodeId, assetId, role);
  }
}
