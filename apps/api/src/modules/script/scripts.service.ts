import { HttpStatus, Injectable } from "@nestjs/common";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateScriptDto, UpdateScriptDto } from "./dto/script.dto";
import { emptyToNull, mapScript, SCRIPT_BLOCK_INCLUDE } from "./script.mapper";

const SCRIPT_INCLUDE = {
  scenes: {
    orderBy: { number: "asc" as const },
    include: {
      blocks: {
        orderBy: { order: "asc" as const },
        include: SCRIPT_BLOCK_INCLUDE,
      },
    },
  },
};

@Injectable()
export class ScriptsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(projectId: string, episodeId: string) {
    await this.ensureEpisode(projectId, episodeId);
    const row = await this.prisma.script.findUnique({
      where: { episodeId },
      include: SCRIPT_INCLUDE,
    });
    if (!row || row.projectId !== projectId) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SCRIPT_NOT_FOUND,
        "尚未创建剧本",
      );
    }
    return mapScript(row);
  }

  async assertEditable(projectId: string, episodeId: string) {
    const script = await this.get(projectId, episodeId);
    if (script.status === "LOCKED") {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.SCRIPT_LOCKED,
        "剧本已锁定，无法编辑",
      );
    }
    return script;
  }

  async create(projectId: string, episodeId: string, dto: CreateScriptDto) {
    await this.ensureEpisode(projectId, episodeId);
    const existing = await this.prisma.script.findUnique({ where: { episodeId } });
    if (existing) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.SCRIPT_ALREADY_EXISTS,
        "该剧集已经存在剧本",
      );
    }
    const row = await this.prisma.script.create({
      data: {
        projectId,
        episodeId,
        title: dto.title.trim(),
        logline: emptyToNull(dto.logline) ?? null,
        summary: emptyToNull(dto.summary) ?? null,
        estimatedDurationSeconds: dto.estimatedDurationSeconds ?? null,
        status: dto.status ?? "DRAFT",
      },
      include: SCRIPT_INCLUDE,
    });
    return mapScript(row);
  }

  async update(projectId: string, episodeId: string, dto: UpdateScriptDto) {
    const current = await this.get(projectId, episodeId);
    if (current.status === "LOCKED" && dto.status !== "LOCKED") {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.SCRIPT_LOCKED,
        "剧本已锁定，无法编辑",
      );
    }
    const row = await this.prisma.script.update({
      where: { episodeId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.logline !== undefined ? { logline: emptyToNull(dto.logline) } : {}),
        ...(dto.summary !== undefined ? { summary: emptyToNull(dto.summary) } : {}),
        ...(dto.estimatedDurationSeconds !== undefined
          ? { estimatedDurationSeconds: dto.estimatedDurationSeconds }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: SCRIPT_INCLUDE,
    });
    return mapScript(row);
  }

  async remove(projectId: string, episodeId: string) {
    await this.get(projectId, episodeId);
    await this.prisma.script.delete({ where: { episodeId } });
  }

  async ensureEpisode(projectId: string, episodeId: string) {
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
        ErrorCodes.PROJECT_EPISODE_MISMATCH,
        "剧集不属于当前项目",
      );
    }
    return episode;
  }
}
