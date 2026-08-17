import { HttpStatus, Injectable } from "@nestjs/common";
import {
  continuityResult,
  hasEpisodeNumberGap,
  previousEpisodeNumber,
} from "@ai-drama-studio/core";
import type { ContinuityCheckResult, EpisodeStoryState } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { asStoryState, mapEpisode } from "./story.mapper";

@Injectable()
export class StoryContinuityService {
  constructor(private readonly prisma: PrismaService) {}

  async getEpisodeContext(projectId: string, episodeId: string) {
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
    const season = await this.prisma.season.findUnique({
      where: { id: episode.seasonId },
    });
    if (!season || season.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SEASON_NOT_IN_PROJECT,
        "季不属于当前项目",
      );
    }
    return { episode: mapEpisode(episode), season };
  }

  async getPreviousEpisodeState(seasonId: string, episodeNumber: number) {
    const previous = previousEpisodeNumber(episodeNumber);
    if (!previous) {
      return null;
    }
    const row = await this.prisma.episode.findFirst({
      where: { seasonId, number: previous },
    });
    return row ? asStoryState(row.storyState) : null;
  }

  async getCurrentStoryState(episodeId: string): Promise<EpisodeStoryState | null> {
    const row = await this.prisma.episode.findUnique({
      where: { id: episodeId },
    });
    return row ? asStoryState(row.storyState) : null;
  }

  async validateEpisodeContinuity(
    projectId: string,
    seasonId: string,
    episodeId?: string,
  ): Promise<ContinuityCheckResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
    });
    if (!season) {
      errors.push("季不存在");
      return continuityResult(errors, warnings);
    }
    if (season.projectId !== projectId) {
      errors.push("季不属于当前项目");
    }
    const world = await this.prisma.world.findUnique({ where: { projectId } });
    if (world && world.projectId !== projectId) {
      errors.push("世界观不属于当前项目");
    }
    const characters = await this.prisma.character.findMany({
      where: { projectId },
      select: { id: true, projectId: true },
    });
    if (characters.some((item) => item.projectId !== projectId)) {
      errors.push("存在不属于当前项目的人物");
    }
    const episodes = await this.prisma.episode.findMany({
      where: { seasonId },
      select: { id: true, number: true, projectId: true, seasonId: true },
      orderBy: { number: "asc" },
    });
    if (episodes.some((item) => item.projectId !== projectId)) {
      errors.push("存在跨项目剧集");
    }
    if (episodes.some((item) => item.seasonId !== seasonId)) {
      errors.push("存在不属于当前季的剧集");
    }
    if (hasEpisodeNumberGap(episodes.map((item) => item.number))) {
      warnings.push("剧集编号不连续");
    }
    if (episodeId) {
      const current = episodes.find((item) => item.id === episodeId);
      if (!current) {
        errors.push("剧集不属于指定季");
      }
    }
    return continuityResult(errors, warnings);
  }

  async validateStoryboardContinuity(projectId: string, episodeId: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.EPISODE_NOT_FOUND, "剧集不存在");
    }
    if (episode.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PROJECT_EPISODE_MISMATCH,
        "剧集不属于当前项目",
      );
    }
    const continuity = await this.validateEpisodeContinuity(
      projectId,
      episode.seasonId,
      episodeId,
    );
    if (!continuity.ok) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PROJECT_EPISODE_MISMATCH,
        continuity.errors.join("；") || "连续性校验失败",
      );
    }
    const script = await this.prisma.script.findUnique({
      where: { episodeId },
      include: {
        scenes: {
          include: { blocks: { select: { id: true, sceneId: true } } },
        },
      },
    });
    if (!script || script.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SCRIPT_REQUIRED_FOR_STORYBOARD,
        "生成分镜前必须先有剧本",
      );
    }
    if (script.scenes.some((scene) => scene.scriptId && scene.scriptId !== script.id)) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.STORYBOARD_INVALID_SCENE,
        "存在不属于当前剧本的场景",
      );
    }
    for (const scene of script.scenes) {
      if (scene.blocks.some((block) => block.sceneId !== scene.id)) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.STORYBOARD_INVALID_SCRIPT_BLOCK,
          "存在不属于当前场景的剧本段落",
        );
      }
    }
    const characters = await this.prisma.character.findMany({
      where: { projectId },
      select: { id: true, projectId: true },
    });
    if (characters.some((item) => item.projectId !== projectId)) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.STORYBOARD_INVALID_CHARACTER,
        "存在不属于当前项目的人物",
      );
    }
    return { episode, script, continuity };
  }
}
