import { createReadStream } from "node:fs";
import { HttpStatus, Injectable, StreamableFile } from "@nestjs/common";
import { AssetStatus, AssetType, AudioAssetRole, ScriptBlockAssetRole, StoryboardShotAssetRole } from "@prisma/client";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { mapAsset, mapBlockAsset, mapEpisodeAudioAsset, mapShotAsset } from "./asset.mapper";
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

  async listScriptBlockAssets(projectId: string, scriptBlockId: string) {
    const block = await this.requireOwnedScriptBlock(projectId, scriptBlockId);
    const rows = await this.prisma.scriptBlockAsset.findMany({
      where: { scriptBlockId: block.id },
      include: { asset: true },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(mapBlockAsset);
  }

  async setPrimaryScriptBlockAsset(
    projectId: string,
    scriptBlockId: string,
    assetId: string,
  ) {
    const block = await this.requireOwnedScriptBlock(projectId, scriptBlockId);
    const relation = await this.prisma.scriptBlockAsset.findUnique({
      where: { scriptBlockId_assetId: { scriptBlockId: block.id, assetId } },
    });
    if (!relation) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.TTS_ASSET_NOT_FOUND,
        "对白未关联该音频",
      );
    }
    const asset = await this.requireAsset(projectId, assetId);
    if (asset.type !== AssetType.AUDIO) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TTS_ASSET_PROJECT_MISMATCH,
        "只能将对白的音频设为最终语音",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.scriptBlockAsset.updateMany({
        where: {
          scriptBlockId: block.id,
          isPrimary: true,
          asset: { type: AssetType.AUDIO },
        },
        data: { isPrimary: false },
      });
      await tx.scriptBlockAsset.update({
        where: { id: relation.id },
        data: { isPrimary: true, role: ScriptBlockAssetRole.FINAL },
      });
      if (asset.status !== AssetStatus.READY) {
        await tx.asset.update({
          where: { id: asset.id },
          data: { status: AssetStatus.READY },
        });
      }
    });
    return this.listScriptBlockAssets(projectId, scriptBlockId);
  }

  async listEpisodeAudioAssets(
    projectId: string,
    episodeId?: string,
    role?: AudioAssetRole,
  ) {
    await this.ensureProject(projectId);
    if (episodeId) {
      await this.requireOwnedEpisode(projectId, episodeId);
    }
    const rows = await this.prisma.episodeAudioAsset.findMany({
      where: {
        ...(episodeId ? { episodeId } : {}),
        ...(role ? { role } : {}),
        episode: { projectId },
        asset: { status: { not: AssetStatus.DELETED } },
      },
      include: { asset: true },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows.map(mapEpisodeAudioAsset);
  }

  async setPrimaryEpisodeAudioAsset(
    projectId: string,
    episodeId: string,
    assetId: string,
    role?: AudioAssetRole,
  ) {
    await this.requireOwnedEpisode(projectId, episodeId);
    const relation = await this.prisma.episodeAudioAsset.findUnique({
      where: { episodeId_assetId: { episodeId, assetId } },
    });
    if (!relation) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.ASSET_NOT_FOUND,
        "剧集未关联该音频",
      );
    }
    const targetRole = role ?? relation.role;
    if (relation.role !== targetRole) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.EPISODE_NOT_IN_PROJECT,
        "音频角色不匹配",
      );
    }
    const asset = await this.requireAsset(projectId, assetId);
    if (asset.type !== AssetType.AUDIO) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.EPISODE_NOT_IN_PROJECT,
        "只能将音频设为最终",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.episodeAudioAsset.updateMany({
        where: {
          episodeId,
          role: targetRole,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
      await tx.episodeAudioAsset.update({
        where: { id: relation.id },
        data: { isPrimary: true },
      });
      if (asset.status !== AssetStatus.READY) {
        await tx.asset.update({
          where: { id: asset.id },
          data: { status: AssetStatus.READY },
        });
      }
    });
    return this.listEpisodeAudioAssets(projectId, episodeId, targetRole);
  }

  private async requireOwnedEpisode(projectId: string, episodeId: string) {
    await this.ensureProject(projectId);
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
    });
    if (!episode) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.EPISODE_NOT_FOUND,
        "剧集不存在",
      );
    }
    if (episode.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.EPISODE_NOT_IN_PROJECT,
        "剧集不属于当前项目",
      );
    }
    return episode;
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

  private async requireOwnedScriptBlock(projectId: string, scriptBlockId: string) {
    await this.ensureProject(projectId);
    const block = await this.prisma.scriptBlock.findUnique({
      where: { id: scriptBlockId },
      include: { scene: { include: { script: true } } },
    });
    if (!block) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SCRIPT_BLOCK_NOT_FOUND,
        "剧本段落不存在",
      );
    }
    if (block.scene.script.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TTS_ASSET_PROJECT_MISMATCH,
        "对白不属于当前项目",
      );
    }
    return block;
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND, "项目不存在");
    }
    return project;
  }
}
