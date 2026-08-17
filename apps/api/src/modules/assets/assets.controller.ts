import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { AssetType } from "@prisma/client";
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
}
