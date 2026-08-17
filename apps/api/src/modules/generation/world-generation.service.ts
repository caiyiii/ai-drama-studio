import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AiCapability,
  GenerationTaskStatus,
  GenerationTaskType,
  Prisma,
} from "@prisma/client";
import type { WorldGenerationResult } from "@ai-drama-studio/types";
import { PrismaService } from "../../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { AiProviderError } from "../ai/ai.errors";
import { buildWorldGenerationPrompt } from "../ai/prompts/world-generation.prompt";
import { GenerationExecutor } from "./generation.executor";
import { validateWorldGenerationResult } from "./world/world-generation.schema";
import { applyWorldGenerationResult } from "./world/apply-world-generation";
import { CreateWorldGenerationDto } from "./dto/create-world-generation.dto";

@Injectable()
export class WorldGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly executor: GenerationExecutor,
  ) {}

  async createWorldGeneration(projectId: string, dto: CreateWorldGenerationDto) {
    await this.ensureProject(projectId);
    const resolved = await this.ai.resolveForCapability(
      projectId,
      AiCapability.STRUCTURED_OUTPUT,
    );
    const input = {
      prompt: dto.prompt.trim(),
      style: dto.style?.trim() || "史诗",
      detailLevel: dto.detailLevel?.trim() || "标准",
    };
    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.WORLD,
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
          const prompt = buildWorldGenerationPrompt(input);
          const raw = await this.ai.generateWith(resolved, {
            system: prompt.system,
            prompt: prompt.prompt,
          });
          return validateWorldGenerationResult(raw);
        },
        resolved.apiKey,
      );
    } catch {
      // Task already marked FAILED. Return it so the client can show the error.
    }

    return this.executor.getTask(projectId, task.id);
  }

  async list(projectId: string) {
    await this.ensureProject(projectId);
    return this.prisma.generationTask.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOne(projectId: string, id: string) {
    await this.ensureProject(projectId);
    return this.executor.getTask(projectId, id);
  }

  async apply(projectId: string, id: string) {
    await this.ensureProject(projectId);
    const task = await this.executor.getTask(projectId, id);
    if (task.status !== GenerationTaskStatus.SUCCEEDED) {
      throw new BadRequestException("只能应用已成功的生成结果");
    }
    if (task.appliedAt) {
      throw new BadRequestException("该生成结果已经应用过");
    }
    let result: WorldGenerationResult;
    try {
      result = validateWorldGenerationResult(task.output);
    } catch (error) {
      throw new BadRequestException(
        error instanceof AiProviderError ? error.message : "生成结果无法通过 Schema 校验",
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await applyWorldGenerationResult(tx, projectId, result);
        await tx.generationTask.update({
          where: { id },
          data: { appliedAt: new Date() },
        });
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? `数据库写入失败：${error.message}` : "数据库写入失败",
      );
    }

    return this.executor.getTask(projectId, id);
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
