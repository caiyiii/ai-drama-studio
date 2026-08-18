import { HttpStatus, Injectable } from "@nestjs/common";
import {
  AssetStatus,
  AudioAssetRole,
  ScriptBlockAssetRole,
  StoryboardShotAssetRole,
  TimelineClipSourceType,
} from "@prisma/client";
import {
  buildAssetVersionFingerprint,
  continuityResult,
} from "@ai-drama-studio/core";
import type { TimelineContinuityResult } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TimelineContinuityService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND, "项目不存在");
    }
    return project;
  }

  async ensureEpisode(projectId: string, episodeId: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.EPISODE_NOT_FOUND, "剧集不存在");
    }
    if (episode.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TIMELINE_EPISODE_MISMATCH,
        "剧集不属于当前项目",
      );
    }
    return episode;
  }

  async ensureTimeline(projectId: string, timelineId: string) {
    const timeline = await this.prisma.episodeTimeline.findUnique({
      where: { id: timelineId },
    });
    if (!timeline) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.TIMELINE_NOT_FOUND, "尚未创建时间线");
    }
    if (timeline.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TIMELINE_PROJECT_MISMATCH,
        "时间线不属于当前项目",
      );
    }
    return timeline;
  }

  async ensureTimelineForEpisode(projectId: string, episodeId: string) {
    await this.ensureEpisode(projectId, episodeId);
    const timeline = await this.prisma.episodeTimeline.findUnique({
      where: { episodeId },
    });
    if (!timeline || timeline.projectId !== projectId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.TIMELINE_NOT_FOUND, "尚未创建时间线");
    }
    return timeline;
  }

  async ensureAsset(projectId: string, assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || asset.status === AssetStatus.DELETED) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.TIMELINE_ASSET_NOT_FOUND, "素材不存在");
    }
    if (asset.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TIMELINE_ASSET_PROJECT_MISMATCH,
        "素材不属于当前项目",
      );
    }
    return asset;
  }

  async validateClipSource(input: {
    projectId: string;
    episodeId: string;
    sourceType: TimelineClipSourceType;
    sourceId: string;
    assetId: string;
  }) {
    const asset = await this.ensureAsset(input.projectId, input.assetId);
    if (input.sourceType === TimelineClipSourceType.ASSET) {
      if (input.sourceId !== input.assetId) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TIMELINE_INVALID_SOURCE,
          "ASSET 来源必须与 assetId 一致",
        );
      }
      return { asset };
    }
    if (input.sourceType === TimelineClipSourceType.STORYBOARD_SHOT) {
      const shot = await this.prisma.storyboardShot.findUnique({
        where: { id: input.sourceId },
        include: { storyboard: true },
      });
      if (!shot || shot.storyboard.episodeId !== input.episodeId) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TIMELINE_INVALID_SOURCE,
          "镜头不属于当前剧集分镜",
        );
      }
      if (shot.storyboard.projectId !== input.projectId) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TIMELINE_PROJECT_MISMATCH,
          "分镜不属于当前项目",
        );
      }
      const relation = await this.prisma.storyboardShotAsset.findUnique({
        where: { shotId_assetId: { shotId: shot.id, assetId: input.assetId } },
      });
      if (!relation) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TIMELINE_INVALID_SOURCE,
          "镜头未关联该视觉素材",
        );
      }
      return { asset, shot };
    }
    if (input.sourceType === TimelineClipSourceType.SCRIPT_BLOCK) {
      const block = await this.prisma.scriptBlock.findUnique({
        where: { id: input.sourceId },
        include: { scene: { include: { script: true } } },
      });
      if (!block || block.scene.script.episodeId !== input.episodeId) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TIMELINE_INVALID_SOURCE,
          "对白不属于当前剧集剧本",
        );
      }
      if (block.scene.script.projectId !== input.projectId) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TIMELINE_PROJECT_MISMATCH,
          "剧本不属于当前项目",
        );
      }
      const relation = await this.prisma.scriptBlockAsset.findUnique({
        where: { scriptBlockId_assetId: { scriptBlockId: block.id, assetId: input.assetId } },
      });
      if (!relation) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TIMELINE_INVALID_SOURCE,
          "对白未关联该音频素材",
        );
      }
      return { asset, block };
    }
    if (input.sourceType === TimelineClipSourceType.EPISODE_AUDIO) {
      const relation = await this.prisma.episodeAudioAsset.findUnique({
        where: { id: input.sourceId },
      });
      if (!relation || relation.episodeId !== input.episodeId) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TIMELINE_INVALID_SOURCE,
          "剧集音频不属于当前剧集",
        );
      }
      if (relation.assetId !== input.assetId) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TIMELINE_INVALID_SOURCE,
          "剧集音频与素材不匹配",
        );
      }
      return { asset, episodeAudio: relation };
    }
    throw new AppError(HttpStatus.BAD_REQUEST, ErrorCodes.TIMELINE_INVALID_SOURCE, "无效的时间线来源");
  }

  async validateTimelineContinuity(
    projectId: string,
    episodeId: string,
  ): Promise<TimelineContinuityResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) {
      errors.push("剧集不存在");
      return continuityResult(errors, warnings);
    }
    if (episode.projectId !== projectId) {
      errors.push("剧集不属于当前项目");
      return continuityResult(errors, warnings);
    }
    const timeline = await this.prisma.episodeTimeline.findUnique({
      where: { episodeId },
      include: {
        tracks: { include: { clips: true } },
      },
    });
    if (!timeline) {
      warnings.push("尚未创建时间线");
      return continuityResult(errors, warnings);
    }
    if (timeline.projectId !== projectId) {
      errors.push("时间线不属于当前项目");
    }
    if (timeline.episodeId !== episodeId) {
      errors.push("时间线不属于当前剧集");
    }
    const storyboard = await this.prisma.storyboard.findUnique({
      where: { episodeId },
    });
    if (storyboard && storyboard.projectId !== projectId) {
      errors.push("分镜不属于当前项目");
    }
    const script = await this.prisma.script.findUnique({ where: { episodeId } });
    if (script && script.projectId !== projectId) {
      errors.push("剧本不属于当前项目");
    }
    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        const asset = await this.prisma.asset.findUnique({ where: { id: clip.assetId } });
        if (!asset) {
          errors.push(`素材不存在: ${clip.assetId}`);
          continue;
        }
        if (asset.projectId !== projectId) {
          errors.push(`跨项目素材: ${clip.assetId}`);
        }
        if (clip.sourceType === TimelineClipSourceType.STORYBOARD_SHOT) {
          const shot = await this.prisma.storyboardShot.findUnique({
            where: { id: clip.sourceId },
            include: { storyboard: true },
          });
          if (!shot || shot.storyboard.episodeId !== episodeId) {
            errors.push(`镜头不属于当前剧集: ${clip.sourceId}`);
          }
        }
        if (clip.sourceType === TimelineClipSourceType.SCRIPT_BLOCK) {
          const block = await this.prisma.scriptBlock.findUnique({
            where: { id: clip.sourceId },
            include: { scene: { include: { script: true } } },
          });
          if (!block || block.scene.script.episodeId !== episodeId) {
            errors.push(`对白不属于当前剧集: ${clip.sourceId}`);
          }
        }
        if (clip.sourceType === TimelineClipSourceType.EPISODE_AUDIO) {
          const audio = await this.prisma.episodeAudioAsset.findUnique({
            where: { id: clip.sourceId },
          });
          if (!audio || audio.episodeId !== episodeId) {
            errors.push(`剧集音频不属于当前剧集: ${clip.sourceId}`);
          }
        }
      }
    }
    return continuityResult(errors, warnings);
  }

  async currentSourceVersions(episodeId: string) {
    const [storyboard, script] = await Promise.all([
      this.prisma.storyboard.findUnique({
        where: { episodeId },
        select: { version: true, projectId: true },
      }),
      this.prisma.script.findUnique({
        where: { episodeId },
        select: { version: true, projectId: true },
      }),
    ]);
    return {
      storyboardVersion: storyboard?.version ?? null,
      scriptVersion: script?.version ?? null,
    };
  }

  async currentAssetFingerprint(projectId: string, episodeId: string): Promise<string> {
    const [shotAssets, blockAssets, episodeAssets] = await Promise.all([
      this.prisma.storyboardShotAsset.findMany({
        where: {
          role: StoryboardShotAssetRole.FINAL,
          shot: { storyboard: { episodeId, projectId } },
        },
        include: { asset: true },
      }),
      this.prisma.scriptBlockAsset.findMany({
        where: {
          role: ScriptBlockAssetRole.FINAL,
          scriptBlock: { scene: { script: { episodeId, projectId } } },
        },
        include: { asset: true },
      }),
      this.prisma.episodeAudioAsset.findMany({
        where: {
          episodeId,
          role: { in: [AudioAssetRole.MUSIC, AudioAssetRole.SFX] },
          episode: { projectId },
        },
        include: { asset: true },
      }),
    ]);
    const assets = [...shotAssets, ...blockAssets, ...episodeAssets]
      .map((item) => item.asset)
      .filter((asset) => asset.projectId === projectId && asset.status !== AssetStatus.DELETED);
    return buildAssetVersionFingerprint(
      assets.map((asset) => ({ id: asset.id, version: asset.version })),
    );
  }
}
