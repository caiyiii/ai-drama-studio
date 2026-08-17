import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiCapability, AiProviderKind, Prisma } from "@prisma/client";
import {
  isLegacyTextCapability,
  modelSupportsCapability,
  providerSupportsCapability,
  toLegacyProviderSource,
  type CapabilityProviderSource,
} from "@ai-drama-studio/core";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { CryptoService } from "./crypto/crypto.service";
import { parseEnvProviderKind } from "./providers/create-provider";
import { getSystemProviderDisplayName } from "./system-provider-label";

export type ResolvedProviderSource = "project" | "user" | "default" | "system";

export interface ResolveCapabilityInput {
  projectId?: string;
  capability: AiCapability;
}

export interface ResolvedAiProvider {
  source: ResolvedProviderSource;
  capabilitySource: CapabilityProviderSource;
  capability: AiCapability;
  id: string | null;
  name: string;
  kind: AiProviderKind;
  baseUrl: string;
  model: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

const PROVIDER_INCLUDE = {
  capabilities: true,
  models: true,
} satisfies Prisma.AiProviderInclude;

type ProviderRow = Prisma.AiProviderGetPayload<{
  include: typeof PROVIDER_INCLUDE;
}>;

@Injectable()
export class ProviderResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
  ) {}

  async resolve(projectId?: string): Promise<ResolvedAiProvider> {
    return this.resolveForCapability({
      projectId,
      capability: AiCapability.CHAT,
    });
  }

  async resolveForCapability(
    input: ResolveCapabilityInput,
  ): Promise<ResolvedAiProvider> {
    const capability = input.capability;

    if (input.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: input.projectId },
        include: {
          aiProvider: { include: PROVIDER_INCLUDE },
        },
      });
      if (!project) {
        throw new AppError(HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", "Project not found");
      }

      const config = await this.prisma.projectAiConfig.findUnique({
        where: {
          projectId_capability: {
            projectId: input.projectId,
            capability,
          },
        },
        include: {
          provider: { include: PROVIDER_INCLUDE },
          model: true,
        },
      });

      if (config?.providerId) {
        const provider =
          config.provider ??
          (await this.prisma.aiProvider.findUnique({
            where: { id: config.providerId },
            include: PROVIDER_INCLUDE,
          }));
        if (!provider) {
          throw new AppError(
            HttpStatus.BAD_REQUEST,
            ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
            "项目 AI 配置指向的 Provider 不存在。",
          );
        }
        return this.requireProvider(
          provider,
          capability,
          config.modelId ?? config.model?.id ?? null,
          "PROJECT",
        );
      }

      if (isLegacyTextCapability(capability) && project.aiProvider) {
        const legacy = this.tryProvider(
          project.aiProvider,
          capability,
          null,
          "PROJECT",
        );
        if (legacy) {
          return legacy;
        }
      }
    }

    const userProviders = await this.prisma.aiProvider.findMany({
      where: { userId: { not: null }, enabled: true },
      include: PROVIDER_INCLUDE,
      orderBy: { updatedAt: "desc" },
    });
    for (const row of userProviders) {
      const resolved = this.tryProvider(row, capability, null, "USER");
      if (resolved) {
        return resolved;
      }
    }

    const platform = await this.prisma.aiProvider.findFirst({
      where: {
        isDefault: true,
        enabled: true,
        userId: null,
        projectId: null,
      },
      include: PROVIDER_INCLUDE,
      orderBy: { updatedAt: "desc" },
    });
    if (platform) {
      const resolved = this.tryProvider(platform, capability, null, "PLATFORM");
      if (resolved) {
        return resolved;
      }
    }

    if (isLegacyTextCapability(capability)) {
      const system = this.fromEnv(capability);
      if (system) {
        return system;
      }
    }

    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
      capability === AiCapability.IMAGE
        ? "尚未配置图片生成 AI。"
        : capability === AiCapability.VIDEO
          ? "尚未配置视频生成 AI。"
          : capability === AiCapability.IMAGE_TO_VIDEO
            ? "尚未配置图生视频 AI。"
            : "尚未配置可用的 AI Provider。请前往项目设置 → AI 配置。",
    );
  }

  fromEnv(capability: AiCapability = AiCapability.CHAT): ResolvedAiProvider | null {
    if (!isLegacyTextCapability(capability)) {
      return null;
    }
    const baseUrl = (this.config.get<string>("ai.baseUrl") || "").trim();
    const apiKey = (this.config.get<string>("ai.apiKey") || "").trim();
    const model = (this.config.get<string>("ai.model") || "").trim();
    const provider = this.config.get<string>("ai.provider") || "OPENAI_COMPATIBLE";
    if (!baseUrl || !apiKey || !model) {
      return null;
    }
    const now = new Date(0).toISOString();
    return {
      source: "system",
      capabilitySource: "SYSTEM",
      capability,
      id: "system",
      name: getSystemProviderDisplayName(baseUrl),
      kind: parseEnvProviderKind(provider),
      baseUrl,
      model,
      apiKey,
      createdAt: now,
      updatedAt: now,
    };
  }

  private requireProvider(
    row: ProviderRow,
    capability: AiCapability,
    modelRef: string | null,
    source: CapabilityProviderSource,
  ): ResolvedAiProvider {
    const resolved = this.evaluateProvider(row, capability, modelRef, source, true);
    if (!resolved) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
        "尚未配置可用的 AI Provider。请前往项目设置 → AI 配置。",
      );
    }
    return resolved;
  }

  private tryProvider(
    row: ProviderRow,
    capability: AiCapability,
    modelRef: string | null,
    source: CapabilityProviderSource,
  ): ResolvedAiProvider | null {
    return this.evaluateProvider(row, capability, modelRef, source, false);
  }

  private evaluateProvider(
    row: ProviderRow,
    capability: AiCapability,
    modelRef: string | null,
    source: CapabilityProviderSource,
    strict: boolean,
  ): ResolvedAiProvider | null {
    if (!row.enabled) {
      if (strict) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.PROVIDER_DISABLED,
          "所选 Provider 已停用。",
        );
      }
      return null;
    }
    if (!row.encryptedApiKey) {
      if (strict) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.PROVIDER_API_KEY_MISSING,
          "所选 Provider 缺少 API Key。",
        );
      }
      return null;
    }
    if (!providerSupportsCapability(row.capabilities, capability)) {
      if (strict) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED,
          "该 Provider 不支持所选 AI 能力。",
        );
      }
      return null;
    }

    const modelName = this.resolveModelName(row, capability, modelRef, strict);
    if (!modelName) {
      return null;
    }

    return this.fromRow(row, source, capability, modelName);
  }

  private resolveModelName(
    row: ProviderRow,
    capability: AiCapability,
    modelRef: string | null,
    strict: boolean,
  ): string | null {
    const models = row.models ?? [];
    if (modelRef) {
      const match = models.find(
        (item) => item.id === modelRef || item.modelId === modelRef,
      );
      if (!match) {
        if (strict) {
          throw new AppError(
            HttpStatus.BAD_REQUEST,
            ErrorCodes.MODEL_NOT_IN_PROVIDER,
            "指定的 Model 不属于该 Provider。",
          );
        }
        return null;
      }
      return this.assertModel(match, capability, strict) ? match.modelId : null;
    }

    const legacy = models.find((item) => item.modelId === row.model);
    if (legacy) {
      if (!this.assertModel(legacy, capability, strict)) {
        return null;
      }
      return legacy.modelId;
    }
    return row.model;
  }

  private assertModel(
    model: { enabled: boolean; capabilities: AiCapability[] },
    capability: AiCapability,
    strict: boolean,
  ): boolean {
    if (!model.enabled) {
      if (strict) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.MODEL_DISABLED,
          "指定的 Model 已停用。",
        );
      }
      return false;
    }
    if (!modelSupportsCapability(model.capabilities, capability)) {
      if (strict) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.MODEL_CAPABILITY_NOT_SUPPORTED,
          "指定的 Model 不支持该 AI 能力。",
        );
      }
      return false;
    }
    return true;
  }

  private fromRow(
    row: {
      id: string;
      name: string;
      provider: AiProviderKind;
      baseUrl: string;
      encryptedApiKey: string;
      createdAt: Date;
      updatedAt: Date;
    },
    source: CapabilityProviderSource,
    capability: AiCapability,
    model: string,
  ): ResolvedAiProvider {
    return {
      source: toLegacyProviderSource(source),
      capabilitySource: source,
      capability,
      id: row.id,
      name: row.name,
      kind: row.provider,
      baseUrl: row.baseUrl,
      model,
      apiKey: this.crypto.decryptApiKey(row.encryptedApiKey),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
