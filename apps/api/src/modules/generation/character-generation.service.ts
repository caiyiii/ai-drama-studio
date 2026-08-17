import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AiCapability,
  GenerationTaskStatus,
  GenerationTaskType,
  Prisma,
} from "@prisma/client";
import type { CharacterGenerationResult } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { AiProviderError } from "../ai/ai.errors";
import { buildCharacterGenerationPrompt } from "../ai/prompts/character-generation.prompt";
import { GenerationExecutor } from "./generation.executor";
import { applyCharacterGenerationResult } from "./character/apply-character-generation";
import { validateCharacterGenerationResult } from "./character/character-generation.schema";
import { CreateCharacterGenerationDto } from "./dto/create-character-generation.dto";

@Injectable()
export class CharacterGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly executor: GenerationExecutor,
  ) {}

  async createCharacterGeneration(
    projectId: string,
    dto: CreateCharacterGenerationDto,
  ) {
    await this.ensureProject(projectId);
    const resolved = await this.ai.resolveForCapability(
      projectId,
      AiCapability.STRUCTURED_OUTPUT,
    );
    const context = await this.buildContext(projectId, dto);
    const input = {
      prompt: dto.prompt.trim(),
      style: dto.style?.trim() || "科幻",
      detailLevel: dto.detailLevel?.trim() || "MEDIUM",
      name: dto.name?.trim() || undefined,
      role: dto.role?.trim() || undefined,
      gender: dto.gender?.trim() || undefined,
      age: dto.age?.trim() || undefined,
      civilizationId: dto.civilizationId || undefined,
      factionId: dto.factionId || undefined,
      personality: dto.personality?.trim() || undefined,
      appearance: dto.appearance?.trim() || undefined,
      background: dto.background?.trim() || undefined,
      goal: dto.goal?.trim() || undefined,
      motivation: dto.motivation?.trim() || undefined,
      conflict: dto.conflict?.trim() || undefined,
    };
    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.CHARACTER,
        status: GenerationTaskStatus.PENDING,
        capability: AiCapability.STRUCTURED_OUTPUT,
        provider:
          resolved.source === "system" ? resolved.kind : resolved.name,
        model: resolved.model || null,
        input: input as Prisma.InputJsonValue,
      },
    });

    try {
      await this.executor.run(
        task.id,
        async () => {
          const prompt = buildCharacterGenerationPrompt({
            ...input,
            ...context,
          });
          const raw = await this.ai.generateWith(resolved, {
            system: prompt.system,
            prompt: prompt.prompt,
          });
          return validateCharacterGenerationResult(raw);
        },
        resolved.apiKey,
      );
    } catch {
      // Task already marked FAILED. Return it so the client can show the error.
    }

    return this.executor.getTask(projectId, task.id);
  }

  async apply(projectId: string, id: string) {
    await this.ensureProject(projectId);
    const task = await this.executor.getTask(projectId, id);
    if (task.type !== GenerationTaskType.CHARACTER) {
      throw new BadRequestException("只能应用人物生成结果");
    }
    if (task.status !== GenerationTaskStatus.SUCCEEDED) {
      throw new BadRequestException("只能应用已成功的生成结果");
    }
    if (task.appliedAt) {
      throw new BadRequestException("该生成结果已经应用过");
    }

    let result: CharacterGenerationResult;
    try {
      result = validateCharacterGenerationResult(task.output);
    } catch (error) {
      throw new BadRequestException(
        error instanceof AiProviderError
          ? error.message
          : "生成结果无法通过 Schema 校验",
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await applyCharacterGenerationResult(tx, projectId, id, result);
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new BadRequestException(
        error instanceof Error ? `数据库写入失败：${error.message}` : "数据库写入失败",
      );
    }

    return this.executor.getTask(projectId, id);
  }

  private async buildContext(
    projectId: string,
    dto: CreateCharacterGenerationDto,
  ) {
    const world = await this.prisma.world.findUnique({
      where: { projectId },
    });
    const existing = await this.prisma.character.findMany({
      where: { projectId },
      select: { name: true },
      orderBy: { createdAt: "asc" },
    });

    let civilizationName: string | undefined;
    let civilizationDescription: string | undefined;
    let factionName: string | undefined;
    let factionDescription: string | undefined;

    if (dto.civilizationId?.trim()) {
      if (!world) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.CIVILIZATION_NOT_IN_PROJECT,
          "文明不属于当前项目",
        );
      }
      const civilization = await this.prisma.civilization.findFirst({
        where: { id: dto.civilizationId.trim(), worldId: world.id },
      });
      if (!civilization) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.CIVILIZATION_NOT_IN_PROJECT,
          "文明不属于当前项目",
        );
      }
      civilizationName = civilization.name;
      civilizationDescription = civilization.description ?? undefined;
    }

    if (dto.factionId?.trim()) {
      if (!world) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.FACTION_NOT_IN_PROJECT,
          "势力不属于当前项目",
        );
      }
      const faction = await this.prisma.faction.findFirst({
        where: { id: dto.factionId.trim(), worldId: world.id },
      });
      if (!faction) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.FACTION_NOT_IN_PROJECT,
          "势力不属于当前项目",
        );
      }
      factionName = faction.name;
      factionDescription = faction.description ?? undefined;
    }

    return {
      worldTitle: world?.title,
      worldSummary: world?.summary ?? undefined,
      coreConflict: world?.coreConflict ?? undefined,
      civilizationName,
      civilizationDescription,
      factionName,
      factionDescription,
      existingNames: existing.map((item) => item.name),
    };
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return project;
  }
}
