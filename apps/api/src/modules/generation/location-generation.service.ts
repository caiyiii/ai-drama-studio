import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AiCapability,
  GenerationTaskStatus,
  GenerationTaskType,
  Prisma,
} from "@prisma/client";
import type { LocationGenerationResult } from "@ai-drama-studio/types";
import { PrismaService } from "../../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { AiProviderError } from "../ai/ai.errors";
import { buildLocationGenerationPrompt } from "../ai/prompts/location-generation.prompt";
import { GenerationExecutor } from "./generation.executor";
import { CreateLocationGenerationDto } from "./dto/create-location-generation.dto";
import { applyLocationGenerationResult } from "./location/apply-location-generation";
import { validateLocationGenerationResult } from "./location/location-generation.schema";

@Injectable()
export class LocationGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly executor: GenerationExecutor,
  ) {}

  async createLocationGeneration(projectId: string, dto: CreateLocationGenerationDto) {
    await this.ensureProject(projectId);
    const resolved = await this.ai.resolveForCapability(
      projectId,
      AiCapability.STRUCTURED_OUTPUT,
    );
    const context = await this.buildContext(projectId);
    const input = {
      prompt: dto.prompt.trim(),
      style: dto.style?.trim() || "科幻",
      detailLevel: dto.detailLevel?.trim() || "标准",
    };
    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.LOCATION,
        status: GenerationTaskStatus.PENDING,
        capability: AiCapability.STRUCTURED_OUTPUT,
        provider: resolved.source === "system" ? resolved.kind : resolved.name,
        model: resolved.model || null,
        input: input as Prisma.InputJsonValue,
      },
    });

    try {
      await this.executor.run(
        task.id,
        async () => {
          const prompt = buildLocationGenerationPrompt({ ...input, ...context });
          const raw = await this.ai.generateWith(resolved, {
            system: prompt.system,
            prompt: prompt.prompt,
          });
          return validateLocationGenerationResult(raw);
        },
        resolved.apiKey,
      );
    } catch {
      // surfaced via task status
    }

    return this.executor.getTask(projectId, task.id);
  }

  async apply(projectId: string, id: string) {
    await this.ensureProject(projectId);
    const task = await this.executor.getTask(projectId, id);
    if (task.type !== GenerationTaskType.LOCATION) {
      throw new BadRequestException("只能应用场景生成结果");
    }
    if (task.status !== GenerationTaskStatus.SUCCEEDED) {
      throw new BadRequestException("只能应用已成功的生成结果");
    }
    if (task.appliedAt) {
      throw new BadRequestException("该生成结果已经应用过");
    }

    let result: LocationGenerationResult;
    try {
      result = validateLocationGenerationResult(task.output);
    } catch (error) {
      throw new BadRequestException(
        error instanceof AiProviderError ? error.message : "生成结果无法通过 Schema 校验",
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await applyLocationGenerationResult(tx, projectId, id, result);
    });

    return this.executor.getTask(projectId, id);
  }

  private async buildContext(projectId: string) {
    const [world, storyBible, existing] = await Promise.all([
      this.prisma.world.findUnique({ where: { projectId } }),
      this.prisma.storyBible.findUnique({ where: { projectId } }),
      this.prisma.location.findMany({
        where: { projectId },
        select: { name: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return {
      worldTitle: world?.title,
      worldSummary: world?.summary ?? undefined,
      coreConflict: world?.coreConflict ?? undefined,
      storyBiblePremise: storyBible?.premise ?? undefined,
      storyBibleTone: storyBible?.tone ?? undefined,
      existingNames: existing.map((item) => item.name),
    };
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }
}
