import { createReadStream } from "node:fs";
import { HttpStatus, Injectable, StreamableFile } from "@nestjs/common";
import { AssetStatus, AssetType, StoryboardShotAssetRole } from "@prisma/client";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { mapAsset, mapShotAsset } from "./asset.mapper";
import { AssetStorageService } from "./asset-storage.service";

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AssetStorageService,
  ) {}

  async list(projectId: string, type?: AssetType) {
    await this.ensureProject(projectId);
    const rows = await this.prisma.asset.findMany({
      where: {
        projectId,
        status: { not: AssetStatus.DELETED },
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapAsset);
  }

  async get(projectId: string, assetId: string) {
    const row = await this.requireAsset(projectId, assetId);
    return mapAsset(row);
  }

  async getFile(projectId: string, assetId: string) {
    const row = await this.requireAsset(projectId, assetId);
    if (!row.storageKey) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.ASSET_NOT_FOUND, "资源文件不存在");
    }
    const fullPath = this.storage.resolvePath(row.storageKey);
    return new StreamableFile(createReadStream(fullPath), {
      type: row.mimeType || "application/octet-stream",
      disposition: `inline; filename="${row.name || assetId}"`,
    });
  }

  async listShotAssets(projectId: string, shotId: string, type?: AssetType) {
    const shot = await this.requireOwnedShot(projectId, shotId);
    const rows = await this.prisma.storyboardShotAsset.findMany({
      where: {
        shotId: shot.id,
        ...(type ? { asset: { type } } : {}),
      },
      include: { asset: true },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(mapShotAsset);
  }

  async setPrimaryShotAsset(projectId: string, shotId: string, assetId: string) {
    const shot = await this.requireOwnedShot(projectId, shotId);
    const relation = await this.prisma.storyboardShotAsset.findUnique({
      where: { shotId_assetId: { shotId: shot.id, assetId } },
    });
    if (!relation) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.ASSET_NOT_FOUND, "镜头未关联该资源");
    }
    const asset = await this.requireAsset(projectId, assetId);
    await this.prisma.$transaction(async (tx) => {
      await tx.storyboardShotAsset.updateMany({
        where: {
          shotId: shot.id,
          isPrimary: true,
          asset: { type: asset.type },
        },
        data: { isPrimary: false },
      });
      await tx.storyboardShotAsset.update({
        where: { id: relation.id },
        data: { isPrimary: true, role: StoryboardShotAssetRole.FINAL },
      });
      if (asset.status !== AssetStatus.READY) {
        await tx.asset.update({
          where: { id: asset.id },
          data: { status: AssetStatus.READY },
        });
      }
    });
    return this.listShotAssets(projectId, shotId, asset.type);
  }

  private async requireAsset(projectId: string, assetId: string) {
    await this.ensureProject(projectId);
    const row = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!row || row.projectId !== projectId || row.status === AssetStatus.DELETED) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.ASSET_NOT_FOUND, "资源不存在");
    }
    return row;
  }

  private async requireOwnedShot(projectId: string, shotId: string) {
    await this.ensureProject(projectId);
    const shot = await this.prisma.storyboardShot.findUnique({
      where: { id: shotId },
      include: { storyboard: true },
    });
    if (!shot) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.STORYBOARD_SHOT_NOT_FOUND,
        "镜头不存在",
      );
    }
    if (shot.storyboard.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PROJECT_EPISODE_MISMATCH,
        "镜头不属于当前项目",
      );
    }
    return shot;
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND, "项目不存在");
    }
    return project;
  }
}
