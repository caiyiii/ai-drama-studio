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
}
