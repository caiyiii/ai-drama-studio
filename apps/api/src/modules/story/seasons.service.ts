import { HttpStatus, Injectable } from "@nestjs/common";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSeasonDto, UpdateSeasonDto } from "./dto/season.dto";
import { mapSeason } from "./story.mapper";

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string) {
    await this.ensureProject(projectId);
    const rows = await this.prisma.season.findMany({
      where: { projectId },
      include: { _count: { select: { episodes: true } } },
      orderBy: { number: "asc" },
    });
    return rows.map((row) => mapSeason(row, row._count.episodes));
  }

  async get(projectId: string, seasonId: string) {
    await this.ensureProject(projectId);
    return this.getInProject(projectId, seasonId);
  }

  async create(projectId: string, dto: CreateSeasonDto) {
    await this.ensureProject(projectId);
    await this.assertUniqueNumber(projectId, dto.number);
    const row = await this.prisma.season.create({
      data: {
        projectId,
        number: dto.number,
        title: dto.title.trim(),
        synopsis: emptyToNull(dto.synopsis) ?? null,
        outline: emptyToNull(dto.outline) ?? null,
        status: dto.status ?? "DRAFT",
      },
      include: { _count: { select: { episodes: true } } },
    });
    return mapSeason(row, row._count.episodes);
  }

  async update(projectId: string, seasonId: string, dto: UpdateSeasonDto) {
    const current = await this.getInProject(projectId, seasonId);
    if (dto.number && dto.number !== current.number) {
      await this.assertUniqueNumber(projectId, dto.number, seasonId);
    }
    const row = await this.prisma.season.update({
      where: { id: seasonId },
      data: {
        ...(dto.number !== undefined ? { number: dto.number } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.synopsis !== undefined
          ? { synopsis: emptyToNull(dto.synopsis) }
          : {}),
        ...(dto.outline !== undefined ? { outline: emptyToNull(dto.outline) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: { _count: { select: { episodes: true } } },
    });
    return mapSeason(row, row._count.episodes);
  }

  async remove(projectId: string, seasonId: string) {
    await this.getInProject(projectId, seasonId);
    const count = await this.prisma.episode.count({ where: { seasonId } });
    if (count > 0) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.SEASON_HAS_EPISODES,
        "该季下仍有剧集，无法删除",
      );
    }
    await this.prisma.season.delete({ where: { id: seasonId } });
  }

  async getInProject(projectId: string, seasonId: string) {
    const row = await this.prisma.season.findUnique({
      where: { id: seasonId },
      include: { _count: { select: { episodes: true } } },
    });
    if (!row) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SEASON_NOT_FOUND,
        "季不存在",
      );
    }
    if (row.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SEASON_NOT_IN_PROJECT,
        "季不属于当前项目",
      );
    }
    return mapSeason(row, row._count.episodes);
  }

  private async assertUniqueNumber(
    projectId: string,
    number: number,
    excludeId?: string,
  ) {
    const existing = await this.prisma.season.findFirst({
      where: {
        projectId,
        number,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.SEASON_NUMBER_CONFLICT,
        `该项目已经存在第 ${number} 季`,
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
