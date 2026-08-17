import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateStoryboardShotDto,
  ReorderStoryboardShotsDto,
  UpdateStoryboardShotDto,
} from "./dto/storyboard-shot.dto";
import { emptyToNull, mapStoryboardShot } from "./storyboard.mapper";
import { StoryboardsService } from "./storyboards.service";

@Injectable()
export class StoryboardShotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storyboards: StoryboardsService,
  ) {}

  async list(projectId: string, episodeId: string, page = 1, pageSize = 100) {
    const board = await this.storyboards.get(projectId, episodeId);
    const take = Math.min(Math.max(pageSize, 1), 200);
    const skip = Math.max(page - 1, 0) * take;
    const rows = await this.prisma.storyboardShot.findMany({
      where: { storyboardId: board.id },
      orderBy: { shotNumber: "asc" },
      skip,
      take,
      include: {
        shotAssets: {
          orderBy: [
            { isPrimary: "desc" as const },
            { sortOrder: "asc" as const },
            { createdAt: "asc" as const },
          ],
          include: { asset: true },
        },
      },
    });
    return rows.map(mapStoryboardShot);
  }

  async get(projectId: string, episodeId: string, shotId: string) {
    const board = await this.storyboards.get(projectId, episodeId);
    const row = await this.prisma.storyboardShot.findUnique({
      where: { id: shotId },
      include: {
        shotAssets: {
          include: { asset: true },
          orderBy: [
            { isPrimary: "desc" as const },
            { sortOrder: "asc" as const },
            { createdAt: "asc" as const },
          ],
        },
      },
    });
    if (!row || row.storyboardId !== board.id) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.STORYBOARD_SHOT_NOT_FOUND,
        "镜头不存在",
      );
    }
    return mapStoryboardShot(row);
  }

  async create(projectId: string, episodeId: string, dto: CreateStoryboardShotDto) {
    const board = await this.storyboards.assertEditable(projectId, episodeId);
    await this.assertUniqueNumber(board.id, dto.shotNumber);
    const refs = await this.resolveRefs(projectId, episodeId, dto.sceneId, dto);
    const row = await this.prisma.storyboardShot.create({
      data: {
        storyboardId: board.id,
        sceneId: refs.sceneId,
        scriptBlockId: refs.scriptBlockId,
        shotNumber: dto.shotNumber,
        shotType: dto.shotType,
        shotSize: dto.shotSize,
        cameraMovement: dto.cameraMovement,
        cameraAngle: dto.cameraAngle,
        composition: emptyToNull(dto.composition) ?? null,
        visualDescription: dto.visualDescription.trim(),
        characterIds: refs.characterIds as Prisma.InputJsonValue,
        location: emptyToNull(dto.location) ?? null,
        action: emptyToNull(dto.action) ?? null,
        dialogue: emptyToNull(dto.dialogue) ?? null,
        narration: emptyToNull(dto.narration) ?? null,
        direction: emptyToNull(dto.direction) ?? null,
        durationSeconds: dto.durationSeconds,
        transition: dto.transition ?? "CUT",
        lighting: emptyToNull(dto.lighting) ?? null,
        mood: emptyToNull(dto.mood) ?? null,
        visualStyle: emptyToNull(dto.visualStyle) ?? null,
        imagePrompt: emptyToNull(dto.imagePrompt) ?? null,
        videoPrompt: emptyToNull(dto.videoPrompt) ?? null,
        negativePrompt: emptyToNull(dto.negativePrompt) ?? null,
        continuityNotes: emptyToNull(dto.continuityNotes) ?? null,
        cameraMovementParams: (dto.cameraMovementParams ??
          Prisma.JsonNull) as Prisma.InputJsonValue,
        metadata: { sourceScriptBlockIds: refs.scriptBlockIds } as Prisma.InputJsonValue,
      },
    });
    return mapStoryboardShot(row);
  }

  async update(
    projectId: string,
    episodeId: string,
    shotId: string,
    dto: UpdateStoryboardShotDto,
  ) {
    await this.storyboards.assertEditable(projectId, episodeId);
    const current = await this.get(projectId, episodeId, shotId);
    if (dto.shotNumber && dto.shotNumber !== current.shotNumber) {
      await this.assertUniqueNumber(current.storyboardId, dto.shotNumber, shotId);
    }
    if (dto.characterIds) {
      await this.assertCharacters(projectId, dto.characterIds);
    }
    const row = await this.prisma.storyboardShot.update({
      where: { id: shotId },
      data: {
        ...(dto.shotNumber !== undefined ? { shotNumber: dto.shotNumber } : {}),
        ...(dto.shotType !== undefined ? { shotType: dto.shotType } : {}),
        ...(dto.shotSize !== undefined ? { shotSize: dto.shotSize } : {}),
        ...(dto.cameraMovement !== undefined ? { cameraMovement: dto.cameraMovement } : {}),
        ...(dto.cameraAngle !== undefined ? { cameraAngle: dto.cameraAngle } : {}),
        ...(dto.composition !== undefined ? { composition: emptyToNull(dto.composition) } : {}),
        ...(dto.visualDescription !== undefined
          ? { visualDescription: dto.visualDescription.trim() }
          : {}),
        ...(dto.characterIds !== undefined
          ? { characterIds: dto.characterIds as Prisma.InputJsonValue }
          : {}),
        ...(dto.location !== undefined ? { location: emptyToNull(dto.location) } : {}),
        ...(dto.action !== undefined ? { action: emptyToNull(dto.action) } : {}),
        ...(dto.dialogue !== undefined ? { dialogue: emptyToNull(dto.dialogue) } : {}),
        ...(dto.narration !== undefined ? { narration: emptyToNull(dto.narration) } : {}),
        ...(dto.direction !== undefined ? { direction: emptyToNull(dto.direction) } : {}),
        ...(dto.durationSeconds !== undefined ? { durationSeconds: dto.durationSeconds } : {}),
        ...(dto.transition !== undefined ? { transition: dto.transition } : {}),
        ...(dto.lighting !== undefined ? { lighting: emptyToNull(dto.lighting) } : {}),
        ...(dto.mood !== undefined ? { mood: emptyToNull(dto.mood) } : {}),
        ...(dto.visualStyle !== undefined ? { visualStyle: emptyToNull(dto.visualStyle) } : {}),
        ...(dto.imagePrompt !== undefined ? { imagePrompt: emptyToNull(dto.imagePrompt) } : {}),
        ...(dto.videoPrompt !== undefined ? { videoPrompt: emptyToNull(dto.videoPrompt) } : {}),
        ...(dto.negativePrompt !== undefined
          ? { negativePrompt: emptyToNull(dto.negativePrompt) }
          : {}),
        ...(dto.continuityNotes !== undefined
          ? { continuityNotes: emptyToNull(dto.continuityNotes) }
          : {}),
        ...(dto.cameraMovementParams !== undefined
          ? {
              cameraMovementParams: (dto.cameraMovementParams ??
                Prisma.JsonNull) as Prisma.InputJsonValue,
            }
          : {}),
      },
    });
    return mapStoryboardShot(row);
  }

  async remove(projectId: string, episodeId: string, shotId: string) {
    await this.storyboards.assertEditable(projectId, episodeId);
    await this.get(projectId, episodeId, shotId);
    await this.prisma.storyboardShot.delete({ where: { id: shotId } });
  }

  async reorder(projectId: string, episodeId: string, dto: ReorderStoryboardShotsDto) {
    const board = await this.storyboards.assertEditable(projectId, episodeId);
    const existing = await this.prisma.storyboardShot.findMany({
      where: { storyboardId: board.id },
      orderBy: { shotNumber: "asc" },
    });
    if (
      dto.ids.length !== existing.length ||
      dto.ids.some((id) => !existing.some((item) => item.id === id))
    ) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.STORYBOARD_SHOT_NOT_FOUND,
        "排序列表必须包含全部分镜镜头",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      for (const [index, id] of dto.ids.entries()) {
        await tx.storyboardShot.update({ where: { id }, data: { shotNumber: -(index + 1) } });
      }
      for (const [index, id] of dto.ids.entries()) {
        await tx.storyboardShot.update({ where: { id }, data: { shotNumber: index + 1 } });
      }
    });
    return this.list(projectId, episodeId, 1, 200);
  }

  private async assertUniqueNumber(storyboardId: string, shotNumber: number, excludeId?: string) {
    const existing = await this.prisma.storyboardShot.findFirst({
      where: {
        storyboardId,
        shotNumber,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.STORYBOARD_SHOT_NUMBER_CONFLICT,
        `已经存在镜头 ${shotNumber}`,
      );
    }
  }

  private async resolveRefs(
    projectId: string,
    episodeId: string,
    sceneId: string,
    dto: Pick<CreateStoryboardShotDto, "scriptBlockId" | "scriptBlockIds" | "characterIds">,
  ) {
    const script = await this.storyboards.requireScript(projectId, episodeId);
    const scene = await this.prisma.scene.findUnique({ where: { id: sceneId } });
    if (!scene || scene.scriptId !== script.id) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.STORYBOARD_INVALID_SCENE,
        "场景不属于当前剧本",
      );
    }
    const blockIds = [
      ...new Set(
        [dto.scriptBlockId, ...(dto.scriptBlockIds ?? [])].filter(
          (id): id is string => Boolean(id),
        ),
      ),
    ];
    for (const blockId of blockIds) {
      const block = await this.prisma.scriptBlock.findUnique({ where: { id: blockId } });
      if (!block || block.sceneId !== scene.id) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.STORYBOARD_INVALID_SCRIPT_BLOCK,
          "剧本段落不属于当前场景",
        );
      }
    }
    const characterIds = dto.characterIds ?? [];
    await this.assertCharacters(projectId, characterIds);
    return {
      sceneId: scene.id,
      scriptBlockId: blockIds[0] ?? null,
      scriptBlockIds: blockIds,
      characterIds,
    };
  }

  private async assertCharacters(projectId: string, characterIds: string[]) {
    for (const characterId of characterIds) {
      const character = await this.prisma.character.findUnique({ where: { id: characterId } });
      if (!character) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.STORYBOARD_INVALID_CHARACTER,
          "人物不存在",
        );
      }
      if (character.projectId !== projectId) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.STORYBOARD_INVALID_CHARACTER,
          "人物不属于当前项目",
        );
      }
    }
  }
}
