import { HttpStatus, Injectable } from "@nestjs/common";
import { GenerationTaskType, Prisma } from "@prisma/client";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateEpisodeDto,
  ReorderEpisodesDto,
  UpdateEpisodeDto,
} from "./dto/episode.dto";
import { SeasonsService } from "./seasons.service";
import { mapEpisode } from "./story.mapper";

@Injectable()
export class EpisodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasons: SeasonsService,
  ) {}

  async list(projectId: string, seasonId?: string) {
    if (seasonId) {
      await this.seasons.getInProject(projectId, seasonId);
    } else {
      await this.ensureProject(projectId);
    }
    const rows = await this.prisma.episode.findMany({
      where: {
        projectId,
        ...(seasonId ? { seasonId } : {}),
      },
      orderBy: [{ seasonId: "asc" }, { number: "asc" }],
    });
    return rows.map((row) => mapEpisode(row));
  }

  async get(projectId: string, seasonId: string, episodeId: string) {
    await this.seasons.getInProject(projectId, seasonId);
    return this.getInSeason(projectId, seasonId, episodeId);
  }

  async create(projectId: string, seasonId: string, dto: CreateEpisodeDto) {
    await this.seasons.getInProject(projectId, seasonId);
    await this.assertUniqueNumber(seasonId, dto.number);
    const row = await this.prisma.episode.create({
      data: {
        projectId,
        seasonId,
        number: dto.number,
        order: dto.number,
        title: dto.title.trim(),
        synopsis: emptyToNull(dto.synopsis) ?? null,
        outline: emptyToNull(dto.outline) ?? null,
        status: dto.status ?? "DRAFT",
        durationSeconds: dto.durationSeconds ?? null,
        storyState: (dto.storyState ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        continuityNotes: emptyToNull(dto.continuityNotes) ?? null,
      },
    });
    return mapEpisode(row);
  }

  async update(
    projectId: string,
    seasonId: string,
    episodeId: string,
    dto: UpdateEpisodeDto,
  ) {
    const current = await this.getInSeason(projectId, seasonId, episodeId);
    if (dto.number && dto.number !== current.number) {
      await this.assertUniqueNumber(seasonId, dto.number, episodeId);
    }
    const row = await this.prisma.episode.update({
      where: { id: episodeId },
      data: {
        ...(dto.number !== undefined
          ? { number: dto.number, order: dto.number }
          : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.synopsis !== undefined
          ? { synopsis: emptyToNull(dto.synopsis) }
          : {}),
        ...(dto.outline !== undefined ? { outline: emptyToNull(dto.outline) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.durationSeconds !== undefined
          ? { durationSeconds: dto.durationSeconds }
          : {}),
        ...(dto.storyState !== undefined
          ? {
              storyState: (dto.storyState ??
                Prisma.JsonNull) as Prisma.InputJsonValue,
            }
          : {}),
        ...(dto.continuityNotes !== undefined
          ? { continuityNotes: emptyToNull(dto.continuityNotes) }
          : {}),
      },
    });
    return mapEpisode(row);
  }

  async remove(projectId: string, seasonId: string, episodeId: string) {
    await this.getInSeason(projectId, seasonId, episodeId);
    await this.assertDeletable(projectId, episodeId);
    await this.prisma.episode.delete({ where: { id: episodeId } });
  }

  async reorder(projectId: string, seasonId: string, dto: ReorderEpisodesDto) {
    await this.seasons.getInProject(projectId, seasonId);
    const existing = await this.prisma.episode.findMany({
      where: { projectId, seasonId },
      orderBy: { number: "asc" },
    });
    if (dto.ids.length !== existing.length) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.EPISODE_NOT_IN_SEASON,
        "排序列表必须包含该季全部剧集",
      );
    }
    const existingIds = new Set(existing.map((item) => item.id));
    if (dto.ids.some((id) => !existingIds.has(id))) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.EPISODE_NOT_IN_SEASON,
        "排序列表包含不属于当前季的剧集",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      for (const [index, id] of dto.ids.entries()) {
        await tx.episode.update({
          where: { id },
          data: { number: -(index + 1), order: -(index + 1) },
        });
      }
      for (const [index, id] of dto.ids.entries()) {
        const number = index + 1;
        await tx.episode.update({
          where: { id },
          data: { number, order: number },
        });
      }
    });
    return this.list(projectId, seasonId);
  }

  async getInSeason(projectId: string, seasonId: string, episodeId: string) {
    const row = await this.prisma.episode.findUnique({
      where: { id: episodeId },
    });
    if (!row) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.EPISODE_NOT_FOUND,
        "剧集不存在",
      );
    }
    if (row.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.EPISODE_NOT_IN_PROJECT,
        "剧集不属于当前项目",
      );
    }
    if (row.seasonId !== seasonId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.EPISODE_NOT_IN_SEASON,
        "剧集不属于当前季",
      );
    }
    return mapEpisode(row);
  }

  private async assertUniqueNumber(
    seasonId: string,
    number: number,
    excludeId?: string,
  ) {
    const existing = await this.prisma.episode.findFirst({
      where: {
        seasonId,
        number,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.EPISODE_NUMBER_CONFLICT,
        `该季已经存在第 ${number} 集`,
      );
    }
  }

  private async assertDeletable(projectId: string, episodeId: string) {
    const storyboard = await this.prisma.storyboard.findUnique({ where: { episodeId } });
    if (storyboard) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.EPISODE_HAS_DEPENDENCIES,
        "该剧集已有分镜，无法删除",
      );
    }
    const script = await this.prisma.script.findUnique({ where: { episodeId } });
    if (script) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.EPISODE_HAS_DEPENDENCIES,
        "该剧集已有剧本，无法删除",
      );
    }
    const tasks = await this.prisma.generationTask.findMany({
      where: {
        projectId,
        type: {
          in: [
            GenerationTaskType.SCRIPT,
            GenerationTaskType.STORYBOARD,
            GenerationTaskType.IMAGE,
            GenerationTaskType.VIDEO,
          ],
        },
      },
      select: { input: true },
    });
    const linked = tasks.some((task) => {
      const input = task.input;
      return (
        input &&
        typeof input === "object" &&
        !Array.isArray(input) &&
        (input as { episodeId?: string }).episodeId === episodeId
      );
    });
    if (linked) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.EPISODE_HAS_DEPENDENCIES,
        "该剧集已有后续生成任务，无法删除",
      );
    }
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.PROJECT_NOT_FOUND,
        "项目不存在",
      );
    }
  }
}

function emptyToNull(value?: string | null): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || !value.trim()) {
    return null;
  }
  return value.trim();
}
