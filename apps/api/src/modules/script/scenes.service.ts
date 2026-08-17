import { HttpStatus, Injectable } from "@nestjs/common";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSceneDto, ReorderScenesDto, UpdateSceneDto } from "./dto/scene.dto";
import { emptyToNull, mapScene } from "./script.mapper";
import { ScriptsService } from "./scripts.service";

const SCENE_INCLUDE = {
  blocks: {
    orderBy: { order: "asc" as const },
    include: {
      character: { select: { id: true, name: true, alias: true, role: true } },
    },
  },
};

@Injectable()
export class ScenesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scripts: ScriptsService,
  ) {}

  async list(projectId: string, episodeId: string) {
    const script = await this.scripts.get(projectId, episodeId);
    const rows = await this.prisma.scene.findMany({
      where: { scriptId: script.id },
      include: SCENE_INCLUDE,
      orderBy: { number: "asc" },
    });
    return rows.map((row) => mapScene(row));
  }

  async get(projectId: string, episodeId: string, sceneId: string) {
    const script = await this.scripts.get(projectId, episodeId);
    const row = await this.prisma.scene.findUnique({
      where: { id: sceneId },
      include: SCENE_INCLUDE,
    });
    if (!row || row.scriptId !== script.id) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SCENE_NOT_FOUND,
        "场景不存在",
      );
    }
    return mapScene(row);
  }

  async create(projectId: string, episodeId: string, dto: CreateSceneDto) {
    const script = await this.scripts.assertEditable(projectId, episodeId);
    await this.assertUniqueNumber(script.id, dto.number);
    const row = await this.prisma.scene.create({
      data: {
        scriptId: script.id,
        number: dto.number,
        title: dto.title.trim(),
        location: emptyToNull(dto.location) ?? null,
        timeOfDay: emptyToNull(dto.timeOfDay) ?? null,
        summary: emptyToNull(dto.summary) ?? null,
        purpose: emptyToNull(dto.purpose) ?? null,
        conflict: emptyToNull(dto.conflict) ?? null,
        estimatedDurationSeconds: dto.estimatedDurationSeconds ?? null,
      },
      include: SCENE_INCLUDE,
    });
    return mapScene(row);
  }

  async update(
    projectId: string,
    episodeId: string,
    sceneId: string,
    dto: UpdateSceneDto,
  ) {
    await this.scripts.assertEditable(projectId, episodeId);
    const current = await this.get(projectId, episodeId, sceneId);
    if (dto.number && dto.number !== current.number) {
      await this.assertUniqueNumber(current.scriptId, dto.number, sceneId);
    }
    const row = await this.prisma.scene.update({
      where: { id: sceneId },
      data: {
        ...(dto.number !== undefined ? { number: dto.number } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.location !== undefined ? { location: emptyToNull(dto.location) } : {}),
        ...(dto.timeOfDay !== undefined ? { timeOfDay: emptyToNull(dto.timeOfDay) } : {}),
        ...(dto.summary !== undefined ? { summary: emptyToNull(dto.summary) } : {}),
        ...(dto.purpose !== undefined ? { purpose: emptyToNull(dto.purpose) } : {}),
        ...(dto.conflict !== undefined ? { conflict: emptyToNull(dto.conflict) } : {}),
        ...(dto.estimatedDurationSeconds !== undefined
          ? { estimatedDurationSeconds: dto.estimatedDurationSeconds }
          : {}),
      },
      include: SCENE_INCLUDE,
    });
    return mapScene(row);
  }

  async remove(projectId: string, episodeId: string, sceneId: string) {
    await this.scripts.assertEditable(projectId, episodeId);
    await this.get(projectId, episodeId, sceneId);
    await this.prisma.scene.delete({ where: { id: sceneId } });
  }

  async reorder(projectId: string, episodeId: string, dto: ReorderScenesDto) {
    const script = await this.scripts.assertEditable(projectId, episodeId);
    const existing = await this.prisma.scene.findMany({
      where: { scriptId: script.id },
      orderBy: { number: "asc" },
    });
    if (dto.ids.length !== existing.length || dto.ids.some((id) => !existing.some((item) => item.id === id))) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SCENE_NOT_FOUND,
        "排序列表必须包含该剧本全部场景",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      for (const [index, id] of dto.ids.entries()) {
        await tx.scene.update({ where: { id }, data: { number: -(index + 1) } });
      }
      for (const [index, id] of dto.ids.entries()) {
        await tx.scene.update({ where: { id }, data: { number: index + 1 } });
      }
    });
    return this.list(projectId, episodeId);
  }

  private async assertUniqueNumber(scriptId: string, number: number, excludeId?: string) {
    const existing = await this.prisma.scene.findFirst({
      where: {
        scriptId,
        number,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.SCENE_NUMBER_CONFLICT,
        `该剧本已经存在第 ${number} 场`,
      );
    }
  }
}
