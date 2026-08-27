import {
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AiCapability, AiProviderKind, type AiProvider } from "@prisma/client";
import type { AIProviderTestResult } from "@ai-drama-studio/types";
import {
  kindAllowsCapability,
} from "@ai-drama-studio/core";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AiProviderError, sanitizeSecret, userFacingAiError } from "./ai.errors";
import { toPublicAiProvider, toPublicFromResolved } from "./ai-provider.mapper";
import { CryptoService } from "./crypto/crypto.service";
import { CreateAiProviderDto } from "./dto/create-ai-provider.dto";
import { TestAiProviderDto } from "./dto/test-ai-provider.dto";
import { UpdateAiProviderDto } from "./dto/update-ai-provider.dto";
import { isSupportedProviderKind, defaultBaseUrlForKind } from "./providers/create-provider";
import { FalProvider } from "./providers/fal/fal.provider";
import { ProviderResolver } from "./provider-resolver";
import { AiService } from "./ai.service";

@Injectable()
export class AiProvidersService {
  private readonly logger = new Logger(AiProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly resolver: ProviderResolver,
    private readonly ai: AiService,
  ) {}

  async list() {
    this.crypto.assertManagementEnabled();
    const rows = await this.prisma.aiProvider.findMany({
      include: { capabilities: true },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map(toPublicAiProvider);
  }

  async getOne(id: string) {
    this.crypto.assertManagementEnabled();
    return toPublicAiProvider(await this.findRow(id));
  }

  async create(dto: CreateAiProviderDto) {
    this.crypto.assertManagementEnabled();
    this.assertSupported(dto.provider);
    const capabilities = this.normalizeCapabilities(dto.provider, dto.capabilities);
    const encryptedApiKey = this.crypto.encryptApiKey(dto.apiKey.trim());
    const model = dto.model.trim();
    const baseUrl =
      (dto.baseUrl?.trim() || "") ||
      defaultBaseUrlForKind(dto.provider) ||
      "";
    if (!baseUrl) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_REQUEST,
        "请填写 Base URL。",
      );
    }
    const created = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.aiProvider.updateMany({
          where: { isDefault: true, userId: null, projectId: null },
          data: { isDefault: false },
        });
      }
      return tx.aiProvider.create({
        data: {
          name: dto.name.trim(),
          provider: dto.provider,
          baseUrl,
          model,
          encryptedApiKey,
          isDefault: Boolean(dto.isDefault),
          enabled: dto.enabled ?? true,
          capabilities: {
            create: capabilities.map((capability) => ({ capability })),
          },
          models: {
            create: {
              name: model,
              modelId: model,
              capabilities,
            },
          },
        },
        include: { capabilities: true },
      });
    });
    return toPublicAiProvider(created);
  }

  async update(id: string, dto: UpdateAiProviderDto) {
    this.crypto.assertManagementEnabled();
    const existing = await this.findRow(id);
    if (dto.provider) {
      this.assertSupported(dto.provider);
    }
    const data: {
      name?: string;
      provider?: AiProviderKind;
      baseUrl?: string;
      model?: string;
      encryptedApiKey?: string;
      isDefault?: boolean;
      enabled?: boolean;
    } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.provider !== undefined) data.provider = dto.provider;
    if (dto.baseUrl !== undefined) data.baseUrl = dto.baseUrl.trim();
    if (dto.model !== undefined) data.model = dto.model.trim();
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.apiKey?.trim()) {
      data.encryptedApiKey = this.crypto.encryptApiKey(dto.apiKey.trim());
    }
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    const capabilities =
      dto.capabilities !== undefined
        ? this.normalizeCapabilities(dto.provider ?? existing.provider, dto.capabilities)
        : undefined;
    const nextModel = dto.model !== undefined ? dto.model.trim() : existing.model;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.aiProvider.updateMany({
          where: {
            isDefault: true,
            userId: existing.userId,
            projectId: existing.projectId,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }
      const row = await tx.aiProvider.update({
        where: { id },
        data,
        include: { capabilities: true },
      });
      if (capabilities) {
        await tx.aiProviderCapability.deleteMany({ where: { providerId: id } });
        await tx.aiProviderCapability.createMany({
          data: capabilities.map((capability) => ({
            providerId: id,
            capability,
          })),
        });
      }
      if (dto.model !== undefined || capabilities) {
        await tx.aiModel.upsert({
          where: {
            providerId_modelId: { providerId: id, modelId: nextModel },
          },
          create: {
            providerId: id,
            name: nextModel,
            modelId: nextModel,
            capabilities: capabilities ?? [
              AiCapability.CHAT,
              AiCapability.STRUCTURED_OUTPUT,
            ],
          },
          update: {
            name: nextModel,
            ...(capabilities ? { capabilities } : {}),
          },
        });
      }
      return {
        ...row,
        capabilities:
          capabilities?.map((capability) => ({
            capability,
            enabled: true,
          })) ?? row.capabilities,
      };
    });
    return toPublicAiProvider(updated);
  }

  async remove(id: string) {
    this.crypto.assertManagementEnabled();
    await this.findRow(id);
    const inUse = await this.prisma.project.count({
      where: { aiProviderId: id },
    });
    const configInUse = await this.prisma.projectAiConfig.count({
      where: { providerId: id },
    });
    if (inUse > 0 || configInUse > 0) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.PROVIDER_IN_USE,
        "该 Provider 正被项目使用，请先更换项目 AI Provider。",
      );
    }
    await this.prisma.aiProvider.delete({ where: { id } });
  }

  async testSaved(id: string): Promise<AIProviderTestResult> {
    this.crypto.assertManagementEnabled();
    const row = await this.findRow(id);
    const apiKey = this.crypto.decryptApiKey(row.encryptedApiKey);
    return this.runTest(
      {
        provider: row.provider,
        baseUrl: row.baseUrl?.trim() || defaultBaseUrlForKind(row.provider) || row.baseUrl,
        apiKey,
        model: row.model,
      },
      apiKey,
    );
  }

  async testDraft(dto: TestAiProviderDto): Promise<AIProviderTestResult> {
    this.crypto.assertManagementEnabled();
    this.assertSupported(dto.provider);
    const baseUrl =
      dto.baseUrl?.trim() || defaultBaseUrlForKind(dto.provider) || "";
    if (!baseUrl) {
      return {
        success: false,
        code: ErrorCodes.INVALID_REQUEST,
        message: "请填写 Base URL。",
      };
    }
    return this.runTest(
      {
        provider: dto.provider,
        baseUrl,
        apiKey: dto.apiKey.trim(),
        model: dto.model.trim(),
      },
      dto.apiKey.trim(),
    );
  }

  async getProjectProvider(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { aiProvider: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    let resolved = null;
    try {
      resolved = toPublicFromResolved(await this.resolver.resolve(projectId));
    } catch (error) {
      if (
        error instanceof AppError &&
        error.code === ErrorCodes.NO_AI_PROVIDER_CONFIGURED
      ) {
        resolved = null;
      } else {
        throw error;
      }
    }
    return {
      aiProviderId: project.aiProviderId,
      selected: project.aiProvider ? toPublicAiProvider(project.aiProvider) : null,
      resolved,
    };
  }

  async setProjectProvider(projectId: string, aiProviderId: string | null | undefined) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    const nextId = aiProviderId?.trim() ? aiProviderId.trim() : null;
    if (nextId) {
      const provider = await this.findRow(nextId);
      if (!provider.enabled) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
          "所选 Provider 已停用。",
        );
      }
    }
    await this.prisma.project.update({
      where: { id: projectId },
      data: { aiProviderId: nextId },
    });
    return this.getProjectProvider(projectId);
  }

  private async runTest(
    input: {
      provider: AiProviderKind;
      baseUrl: string;
      apiKey: string;
      model: string;
    },
    secret: string,
  ): Promise<AIProviderTestResult> {
    try {
      if (!input.model?.trim()) {
        return {
          success: false,
          code: ErrorCodes.INVALID_REQUEST,
          message:
            input.provider === AiProviderKind.FAL
              ? "FAL model endpoint is required. Expected https://queue.fal.run/{model}"
              : "请填写 Model。",
        };
      }
      const runtime = this.ai.runtimeFromConfig({
        kind: input.provider,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey,
        model: input.model,
      });
      if (runtime instanceof FalProvider) {
        const detail = await runtime.testImageConnection();
        return {
          success: true,
          provider: detail.provider,
          capability: detail.capability,
          model: detail.model,
          requestId: detail.requestId,
          message: detail.message,
        };
      }
      await runtime.testConnection();
      return { success: true };
    } catch (error) {
      const message = userFacingAiError(error, secret);
      this.logger.warn(`Provider test failed: ${sanitizeSecret(message, secret)}`);
      const code =
        error instanceof AiProviderError
          ? error.code === "MISSING_API_KEY"
            ? ErrorCodes.INVALID_API_KEY
            : error.code
          : "UNAVAILABLE";
      return { success: false, code, message };
    }
  }

  private assertSupported(kind: AiProviderKind) {
    if (!isSupportedProviderKind(kind)) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PROVIDER_NOT_SUPPORTED,
        `当前支持 OpenAI Compatible 与 FAL.ai Provider。`,
      );
    }
  }

  private normalizeCapabilities(
    kind: AiProviderKind,
    capabilities?: AiCapability[],
  ): AiCapability[] {
    const next =
      capabilities && capabilities.length > 0
        ? Array.from(new Set(capabilities))
        : kind === AiProviderKind.FAL
          ? [AiCapability.IMAGE]
          : [AiCapability.CHAT, AiCapability.STRUCTURED_OUTPUT];
    for (const capability of next) {
      if (!kindAllowsCapability(kind, capability)) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED,
          "该 Provider 类型不支持所选 AI 能力。",
        );
      }
    }
    return next;
  }

  private async findRow(id: string): Promise<AiProvider & { capabilities?: { capability: AiCapability; enabled: boolean }[] }> {
    const row = await this.prisma.aiProvider.findUnique({
      where: { id },
      include: { capabilities: true },
    });
    if (!row) {
      throw new NotFoundException("AI Provider not found");
    }
    return row;
  }
}
