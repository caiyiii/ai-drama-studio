import { HttpStatus, Injectable } from "@nestjs/common";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateStoryboardDto, UpdateStoryboardDto } from "./dto/storyboard.dto";
import { emptyToNull, mapStoryboard } from "./storyboard.mapper";

const SHOT_ORDER = { shotNumber: "asc" as const };

@Injectable()
export class StoryboardsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(projectId: string, episodeId: string) {
    await this.ensureEpisode(projectId, episodeId);
    const [row, script] = await Promise.all([
      this.prisma.storyboard.findUnique({
        where: { episodeId },
        include: { shots: { orderBy: SHOT_ORDER } },
      }),
      this.prisma.script.findUnique({
        where: { episodeId },
        select: { version: true, projectId: true },
      }),
    ]);
    if (!row || row.projectId !== projectId) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.STORYBOARD_NOT_FOUND,
        "尚未创建分镜",
      );
    }
    return mapStoryboard(row, script?.projectId === projectId ? script.version : null);
  }

  async create(projectId: string, episodeId: string, dto: CreateStoryboardDto) {
    const episode = await this.ensureEpisode(projectId, episodeId);
    const script = await this.requireScript(projectId, episodeId);
    const existing = await this.prisma.storyboard.findUnique({ where: { episodeId } });
    if (existing) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.STORYBOARD_ALREADY_EXISTS,
        "该剧集已经存在分镜",
      );
    }
    const row = await this.prisma.storyboard.create({
      data: {
        projectId: episode.projectId,
        episodeId,
        title: dto.title.trim(),
        description: emptyToNull(dto.description) ?? null,
        totalDurationSeconds: dto.totalDurationSeconds ?? null,
        status: dto.status ?? "DRAFT",
        sourceScriptVersion: script.version,
      },
      include: { shots: { orderBy: SHOT_ORDER } },
    });
    return mapStoryboard(row, script.version);
  }

  async update(projectId: string, episodeId: string, dto: UpdateStoryboardDto) {
    const current = await this.get(projectId, episodeId);
    if (current.status === "LOCKED") {
      const unlocking = dto.status !== undefined && dto.status !== "LOCKED";
      const editingOtherFields =
        dto.title !== undefined ||
        dto.description !== undefined ||
        dto.totalDurationSeconds !== undefined;
      if (!unlocking || editingOtherFields) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ErrorCodes.STORYBOARD_LOCKED,
          "分镜已锁定，无法编辑",
        );
      }
    }
    const script = await this.prisma.script.findUnique({
      where: { episodeId },
      select: { version: true },
    });
    const row = await this.prisma.storyboard.update({
      where: { episodeId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: emptyToNull(dto.description) } : {}),
        ...(dto.totalDurationSeconds !== undefined
          ? { totalDurationSeconds: dto.totalDurationSeconds }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: { shots: { orderBy: SHOT_ORDER } },
    });
    return mapStoryboard(row, script?.version);
  }

  async remove(projectId: string, episodeId: string) {
    await this.get(projectId, episodeId);
    await this.prisma.storyboard.delete({ where: { episodeId } });
  }

  async assertEditable(projectId: string, episodeId: string) {
    const board = await this.get(projectId, episodeId);
    if (board.status === "LOCKED") {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.STORYBOARD_LOCKED,
        "分镜已锁定，无法编辑",
      );
    }
    return board;
  }

  async requireScript(projectId: string, episodeId: string) {
    const script = await this.prisma.script.findUnique({ where: { episodeId } });
    if (!script || script.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SCRIPT_REQUIRED_FOR_STORYBOARD,
        "生成分镜前必须先有剧本",
      );
    }
    return script;
  }

  async ensureEpisode(projectId: string, episodeId: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
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
        ErrorCodes.PROJECT_EPISODE_MISMATCH,
        "剧集不属于当前项目",
      );
    }
    return episode;
  }
}
