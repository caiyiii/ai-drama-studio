import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateScriptBlockDto,
  ReorderScriptBlocksDto,
  UpdateScriptBlockDto,
} from "./dto/script-block.dto";
import { mapScriptBlock } from "./script.mapper";
import { ScenesService } from "./scenes.service";
import { ScriptsService } from "./scripts.service";

const BLOCK_INCLUDE = {
  character: { select: { id: true, name: true, alias: true, role: true } },
};

@Injectable()
export class ScriptBlocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scripts: ScriptsService,
    private readonly scenes: ScenesService,
  ) {}

  async list(projectId: string, episodeId: string, sceneId: string) {
    await this.scenes.get(projectId, episodeId, sceneId);
    const rows = await this.prisma.scriptBlock.findMany({
      where: { sceneId },
      include: BLOCK_INCLUDE,
      orderBy: { order: "asc" },
    });
    return rows.map((row) => mapScriptBlock(row));
  }

  async get(projectId: string, episodeId: string, sceneId: string, blockId: string) {
    await this.scenes.get(projectId, episodeId, sceneId);
    const row = await this.prisma.scriptBlock.findUnique({
      where: { id: blockId },
      include: BLOCK_INCLUDE,
    });
    if (!row || row.sceneId !== sceneId) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SCRIPT_BLOCK_NOT_FOUND,
        "剧本段落不存在",
      );
    }
    return mapScriptBlock(row);
  }

  async create(
    projectId: string,
    episodeId: string,
    sceneId: string,
    dto: CreateScriptBlockDto,
  ) {
    await this.scripts.assertEditable(projectId, episodeId);
    await this.scenes.get(projectId, episodeId, sceneId);
    await this.assertUniqueOrder(sceneId, dto.order);
    const characterId = await this.resolveCharacter(projectId, dto.characterId);
    const row = await this.prisma.scriptBlock.create({
      data: {
        sceneId,
        order: dto.order,
        type: dto.type,
        content: dto.content.trim(),
        characterId,
        metadata: (dto.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
      include: BLOCK_INCLUDE,
    });
    return mapScriptBlock(row);
  }

  async update(
    projectId: string,
    episodeId: string,
    sceneId: string,
    blockId: string,
    dto: UpdateScriptBlockDto,
  ) {
    await this.scripts.assertEditable(projectId, episodeId);
    const current = await this.get(projectId, episodeId, sceneId, blockId);
    if (dto.order && dto.order !== current.order) {
      await this.assertUniqueOrder(sceneId, dto.order, blockId);
    }
    const characterId =
      dto.characterId !== undefined
        ? await this.resolveCharacter(projectId, dto.characterId)
        : undefined;
    const row = await this.prisma.scriptBlock.update({
      where: { id: blockId },
      data: {
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
        ...(characterId !== undefined ? { characterId } : {}),
        ...(dto.metadata !== undefined
          ? { metadata: (dto.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue }
          : {}),
      },
      include: BLOCK_INCLUDE,
    });
    return mapScriptBlock(row);
  }

  async remove(projectId: string, episodeId: string, sceneId: string, blockId: string) {
    await this.scripts.assertEditable(projectId, episodeId);
    await this.get(projectId, episodeId, sceneId, blockId);
    await this.prisma.scriptBlock.delete({ where: { id: blockId } });
  }

  async reorder(
    projectId: string,
    episodeId: string,
    sceneId: string,
    dto: ReorderScriptBlocksDto,
  ) {
    await this.scripts.assertEditable(projectId, episodeId);
    await this.scenes.get(projectId, episodeId, sceneId);
    const existing = await this.prisma.scriptBlock.findMany({
      where: { sceneId },
      orderBy: { order: "asc" },
    });
    if (
      dto.ids.length !== existing.length ||
      dto.ids.some((id) => !existing.some((item) => item.id === id))
    ) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.SCRIPT_BLOCK_NOT_FOUND,
        "排序列表必须包含该场全部段落",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      for (const [index, id] of dto.ids.entries()) {
        await tx.scriptBlock.update({ where: { id }, data: { order: -(index + 1) } });
      }
      for (const [index, id] of dto.ids.entries()) {
        await tx.scriptBlock.update({ where: { id }, data: { order: index + 1 } });
      }
    });
    return this.list(projectId, episodeId, sceneId);
  }

  private async assertUniqueOrder(sceneId: string, order: number, excludeId?: string) {
    const existing = await this.prisma.scriptBlock.findFirst({
      where: {
        sceneId,
        order,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.SCRIPT_BLOCK_ORDER_CONFLICT,
        `该场已经存在第 ${order} 个段落`,
      );
    }
  }

  private async resolveCharacter(projectId: string, characterId?: string | null) {
    if (!characterId) {
      return null;
    }
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });
    if (!character) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.CHARACTER_NOT_FOUND,
        "人物不存在",
      );
    }
    if (character.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.CHARACTER_NOT_IN_PROJECT,
        "人物不属于当前项目",
      );
    }
    return character.id;
  }
}
