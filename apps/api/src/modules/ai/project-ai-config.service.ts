import { HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { AiCapability } from "@prisma/client";
import type {
  ProjectAiCapabilitySummary,
  ProjectAiConfigMap,
} from "@ai-drama-studio/types";
import {
  getAiCapabilityDefinitions,
  isAiCapability,
  kindAllowsCapability,
  modelSupportsCapability,
  providerSupportsCapability,
} from "@ai-drama-studio/core";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { ProviderResolver } from "./provider-resolver";
import { SetProjectAiConfigDto } from "./dto/set-project-ai-config.dto";

@Injectable()
export class ProjectAiConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: ProviderResolver,
  ) {}

  listCapabilities() {
    return getAiCapabilityDefinitions();
  }

  async getProjectConfig(projectId: string): Promise<ProjectAiConfigMap> {
    await this.ensureProject(projectId);
    const definitions = getAiCapabilityDefinitions();
    const rows = await this.prisma.projectAiConfig.findMany({
      where: { projectId },
      include: { provider: true, model: true },
    });
    const byCapability = new Map(rows.map((row) => [row.capability, row]));
    const result = {} as ProjectAiConfigMap;

    for (const definition of definitions) {
      const capability = definition.capability as AiCapability;
      const row = byCapability.get(capability);
      if (row?.providerId) {
        result[definition.capability] = {
          providerId: row.providerId,
          providerName: row.provider?.name ?? null,
          model: row.model?.modelId ?? row.provider?.model ?? null,
          source: "PROJECT",
          configured: true,
          implemented: definition.implemented,
        };
        continue;
      }
      try {
        const resolved = await this.resolver.resolveForCapability({
          projectId,
          capability,
        });
        result[definition.capability] = {
          providerId: resolved.id,
          providerName: resolved.name,
          model: resolved.model,
          source: resolved.capabilitySource,
          configured: true,
          implemented: definition.implemented,
        };
      } catch (error) {
        result[definition.capability] = this.summaryFromError(
          error,
          definition.implemented,
        );
      }
    }

    return this.stripSecrets(result);
  }

  async setProjectConfig(
    projectId: string,
    capabilityParam: string,
    dto: SetProjectAiConfigDto,
  ): Promise<ProjectAiConfigMap> {
    await this.ensureProject(projectId);
    const capability = this.parseCapability(capabilityParam);
    const providerId = dto.providerId?.trim() ? dto.providerId.trim() : null;
    if (!providerId) {
      await this.prisma.projectAiConfig.deleteMany({
        where: { projectId, capability },
      });
      return this.getProjectConfig(projectId);
    }

    const provider = await this.prisma.aiProvider.findUnique({
      where: { id: providerId },
      include: { capabilities: true, models: true },
    });
    if (!provider) {
      throw new NotFoundException("AI Provider not found");
    }
    if (!provider.enabled) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PROVIDER_DISABLED,
        "所选 Provider 已停用。",
      );
    }
    if (!provider.encryptedApiKey) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PROVIDER_API_KEY_MISSING,
        "所选 Provider 缺少 API Key。",
      );
    }
    if (
      !kindAllowsCapability(provider.provider, capability) ||
      !providerSupportsCapability(provider.capabilities, capability)
    ) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED,
        "该 Provider 不支持所选 AI 能力。",
      );
    }

    const modelRef = dto.modelId?.trim() ? dto.modelId.trim() : null;
    let modelId: string | null = null;
    if (modelRef) {
      const model = provider.models.find(
        (item) => item.id === modelRef || item.modelId === modelRef,
      );
      if (!model) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.MODEL_NOT_IN_PROVIDER,
          "指定的 Model 不属于该 Provider。",
        );
      }
      if (!model.enabled) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.MODEL_DISABLED,
          "指定的 Model 已停用。",
        );
      }
      if (!modelSupportsCapability(model.capabilities, capability)) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.MODEL_CAPABILITY_NOT_SUPPORTED,
          "指定的 Model 不支持该 AI 能力。",
        );
      }
      modelId = model.id;
    }

    await this.prisma.projectAiConfig.upsert({
      where: {
        projectId_capability: { projectId, capability },
      },
      create: {
        projectId,
        capability,
        providerId,
        modelId,
      },
      update: {
        providerId,
        modelId,
      },
    });
    return this.getProjectConfig(projectId);
  }

  async deleteProjectConfig(
    projectId: string,
    capabilityParam: string,
  ): Promise<ProjectAiConfigMap> {
    await this.ensureProject(projectId);
    const capability = this.parseCapability(capabilityParam);
    await this.prisma.projectAiConfig.deleteMany({
      where: { projectId, capability },
    });
    return this.getProjectConfig(projectId);
  }

  private parseCapability(value: string): AiCapability {
    const normalized = value.trim().toUpperCase();
    if (!isAiCapability(normalized)) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_AI_CAPABILITY,
        "未知的 AI 能力。",
      );
    }
    return normalized as AiCapability;
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

  private summaryFromError(
    error: unknown,
    implemented: boolean,
  ): ProjectAiCapabilitySummary {
    if (error instanceof AppError) {
      if (error.code === ErrorCodes.NO_AI_PROVIDER_CONFIGURED) {
        return { configured: false, implemented };
      }
      return { configured: false, implemented, code: error.code };
    }
    throw error;
  }

  private stripSecrets(result: ProjectAiConfigMap): ProjectAiConfigMap {
    const serialized = JSON.stringify(result);
    if (
      serialized.includes("encryptedApiKey") ||
      serialized.includes('"apiKey"')
    ) {
      throw new Error("AI config payload leaked a secret");
    }
    return result;
  }
}
