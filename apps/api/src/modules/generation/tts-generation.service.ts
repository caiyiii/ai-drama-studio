import { HttpStatus, Injectable } from "@nestjs/common";
import {
  AiCapability,
  GenerationTaskStatus,
  GenerationTaskType,
  Prisma,
  ScriptBlockType,
} from "@prisma/client";
import {
  assertDialogueBlock,
  normalizeTtsText,
  resolveTtsLanguage,
  resolveTtsPitch,
  resolveTtsSpeed,
  resolveTtsVoice,
  sanitizeVoiceProfile,
  validateTtsText,
} from "@ai-drama-studio/core";
import type { CharacterVoiceProfile } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AiProviderError } from "../ai/ai.errors";
import { AiService } from "../ai/ai.service";
import { AssetStorageService } from "../assets/asset-storage.service";
import { GenerationExecutor } from "./generation.executor";
import { CreateTtsGenerationDto } from "./dto/create-tts-generation.dto";
import { buildTtsGenerationPrompt } from "./prompts/tts-generation.prompt";
import {
  applyTtsGeneration,
  persistPreviewAudio,
} from "./tts/apply-tts-generation";
import { validateTtsGenerationResult } from "./tts/tts-generation.schema";
import { assertNoActiveGeneration } from "./assert-no-active-generation";

@Injectable()
export class TtsGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly executor: GenerationExecutor,
    private readonly storage: AssetStorageService,
  ) {}

  async createTtsGeneration(projectId: string, dto: CreateTtsGenerationDto) {
    await this.ensureProject(projectId);
    const block = await this.requireOwnedDialogueBlock(
      projectId,
      dto.episodeId,
      dto.scriptBlockId,
    );
    await assertNoActiveGeneration(this.prisma, {
      projectId,
      type: GenerationTaskType.TTS,
      match: (payload) =>
        String(payload.scriptBlockId || "") === block.id ||
        (String(payload.episodeId || "") === dto.episodeId &&
          String(payload.scriptBlockId || "") === dto.scriptBlockId),
      message: "该对白已有 TTS 生成任务正在进行中。",
    });
    const text = normalizeTtsText(dto.text ?? block.content);
    try {
      validateTtsText(text);
    } catch (error) {
      if (error instanceof Error && error.message === "TTS_TEXT_EMPTY") {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TTS_TEXT_EMPTY,
          "对白文本为空，无法生成语音",
        );
      }
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TTS_TEXT_TOO_LONG,
        "对白文本超过 4000 字，本阶段不自动拆段",
      );
    }

    const character = await this.resolveCharacter(
      projectId,
      dto.characterId || block.characterId,
    );
    const voiceProfile = sanitizeVoiceProfile(
      (character?.voiceProfile ?? null) as CharacterVoiceProfile | null,
    );
    const voiceId = resolveTtsVoice({
      requestVoiceId: dto.voiceId,
      voiceProfile,
    });
    if (!voiceId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TTS_VOICE_REQUIRED,
        "请指定 Voice ID，或先在角色声音配置中填写 Voice ID。",
      );
    }
    const language = resolveTtsLanguage({
      requestLanguage: dto.language,
      voiceProfile,
    });
    const speed = resolveTtsSpeed({
      requestSpeed: dto.speed,
      voiceProfile,
    });
    const pitch = resolveTtsPitch({
      requestPitch: dto.pitch,
      voiceProfile,
    });

    let resolved;
    try {
      resolved = await this.ai.resolveForCapability(projectId, AiCapability.TTS);
    } catch (error) {
      throw this.mapResolveError(error);
    }

    const context = buildTtsGenerationPrompt({
      projectName: (await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      }))?.name,
      episodeTitle: block.episodeTitle,
      sceneTitle: block.sceneTitle,
      characterName: character?.name,
      voiceProfile,
      text,
    });
    const providerLabel =
      resolved.source === "system" ? resolved.kind : resolved.name;
    const input = {
      episodeId: dto.episodeId,
      scriptBlockId: block.id,
      characterId: character?.id,
      text,
      voiceId,
      language,
      speed,
      pitch,
      format: dto.format,
      context,
    };

    const task = await this.prisma.generationTask.create({
      data: {
        projectId,
        type: GenerationTaskType.TTS,
        status: GenerationTaskStatus.PENDING,
        capability: AiCapability.TTS,
        provider: providerLabel,
        model: resolved.model || null,
        input: input as Prisma.InputJsonValue,
      },
    });

    try {
      await this.executor.run(
        task.id,
        async () => {
          const started = Date.now();
          try {
            const raw = await this.ai.generateSpeechWith(resolved, {
              text,
              voice: voiceId,
              language,
              format: dto.format,
              speed,
              pitch,
            });
            const validated = validateTtsGenerationResult(raw);
            return {
              ...validated,
              provider: providerLabel,
              model: resolved.model,
              voice: voiceId,
              durationMs: Date.now() - started,
            };
          } catch (error) {
            throw this.mapProviderError(error);
          }
        },
        resolved.apiKey,
      );
      await this.attachUsage(task.id, {
        characterCount: text.length,
      });
    } catch {
      // FAILED already recorded
    }
    return this.executor.getTask(projectId, task.id);
  }

  async apply(projectId: string, id: string) {
    await this.ensureProject(projectId);
    const task = await this.executor.getTask(projectId, id);
    if (task.type !== GenerationTaskType.TTS && task.type !== GenerationTaskType.VOICE) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.GENERATION_NOT_SUCCEEDED,
        "只能应用语音生成结果",
      );
    }
    if (task.status !== GenerationTaskStatus.SUCCEEDED) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.GENERATION_NOT_SUCCEEDED,
        "只能应用已成功的生成结果",
      );
    }
    if (task.appliedAt) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.GENERATION_ALREADY_APPLIED,
        "该生成结果已经应用过",
      );
    }
    const input = asRecord(task.input);
    const episodeId = String(input.episodeId || "");
    const scriptBlockId = String(input.scriptBlockId || "");
    await this.requireOwnedDialogueBlock(projectId, episodeId, scriptBlockId);
    const result = validateTtsGenerationResult(task.output);
    const file = await persistPreviewAudio(this.storage, projectId, result);
    try {
      await this.prisma.$transaction(async (tx) => {
        await applyTtsGeneration(tx, {
          projectId,
          scriptBlockId,
          taskId: id,
          provider: task.provider,
          model: task.model,
          capability: task.capability,
          text: String(input.text || ""),
          characterId:
            typeof input.characterId === "string" ? input.characterId : undefined,
          voiceId: typeof input.voiceId === "string" ? input.voiceId : undefined,
          language: typeof input.language === "string" ? input.language : undefined,
          file,
        });
      });
    } catch (error) {
      await Promise.allSettled([this.storage.delete(file.saved.storageKey)]);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TTS_APPLY_FAILED,
        "应用语音失败，已回滚",
      );
    }
    return this.executor.getTask(projectId, id);
  }

  private async requireOwnedDialogueBlock(
    projectId: string,
    episodeId: string,
    scriptBlockId: string,
  ) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
    });
    if (!episode || episode.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TTS_ASSET_PROJECT_MISMATCH,
        "剧集不属于当前项目",
      );
    }
    const script = await this.prisma.script.findUnique({
      where: { episodeId },
    });
    if (!script || script.projectId !== projectId) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SCRIPT_NOT_FOUND,
        "尚未创建剧本",
      );
    }
    const block = await this.prisma.scriptBlock.findUnique({
      where: { id: scriptBlockId },
      include: { scene: true },
    });
    if (!block) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.SCRIPT_BLOCK_NOT_FOUND,
        "剧本段落不存在",
      );
    }
    if (block.scene.scriptId !== script.id) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TTS_ASSET_PROJECT_MISMATCH,
        "对白不属于当前项目",
      );
    }
    try {
      assertDialogueBlock(block.type);
    } catch {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TTS_SOURCE_NOT_DIALOGUE,
        "只能从对白段落生成语音",
      );
    }
    return {
      id: block.id,
      content: block.content,
      characterId: block.characterId,
      type: block.type as ScriptBlockType,
      sceneTitle: block.scene.title,
      episodeTitle: episode.title,
    };
  }

  private async resolveCharacter(projectId: string, characterId?: string | null) {
    const id = characterId?.trim();
    if (!id) {
      return null;
    }
    const character = await this.prisma.character.findUnique({
      where: { id },
    });
    if (!character || character.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TTS_ASSET_PROJECT_MISMATCH,
        "角色不属于当前项目",
      );
    }
    return character;
  }

  private async attachUsage(taskId: string, extra: { characterCount: number }) {
    const current = await this.prisma.generationTask.findUnique({
      where: { id: taskId },
      select: { usage: true, output: true },
    });
    const usage = asRecord(current?.usage);
    const output = asRecord(current?.output);
    const audioDurationSeconds =
      typeof output.durationSeconds === "number"
        ? output.durationSeconds
        : undefined;
    await this.prisma.generationTask.update({
      where: { id: taskId },
      data: {
        usage: {
          durationMs: typeof usage.durationMs === "number" ? usage.durationMs : undefined,
          characterCount: extra.characterCount,
          ...(typeof audioDurationSeconds === "number"
            ? { audioDurationSeconds }
            : {}),
        } as Prisma.InputJsonValue,
      },
    });
  }

  private mapResolveError(error: unknown): never {
    if (error instanceof AppError) {
      if (error.code === ErrorCodes.NO_AI_PROVIDER_CONFIGURED) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TTS_PROVIDER_NOT_CONFIGURED,
          "尚未配置语音生成 AI。请在项目设置中选择支持 TTS 的 Provider。",
        );
      }
      if (error.code === ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED) {
        throw new AppError(
          error.getStatus(),
          ErrorCodes.TTS_CAPABILITY_NOT_SUPPORTED,
          "当前 Provider 不支持语音生成。",
        );
      }
      if (error.code === ErrorCodes.MODEL_CAPABILITY_NOT_SUPPORTED) {
        throw new AppError(
          error.getStatus(),
          ErrorCodes.TTS_MODEL_NOT_SUPPORTED,
          "当前模型不支持语音生成。",
        );
      }
      if (error.code === ErrorCodes.PROVIDER_DISABLED) {
        throw new AppError(
          error.getStatus(),
          ErrorCodes.TTS_PROVIDER_DISABLED,
          "语音生成 Provider 已停用。",
        );
      }
      throw error;
    }
    throw error;
  }

  private mapProviderError(error: unknown): never {
    if (error instanceof AiProviderError) {
      if (error.code === "CAPABILITY_NOT_SUPPORTED") {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.TTS_CAPABILITY_NOT_SUPPORTED,
          error.message,
        );
      }
      if (error.code === "TIMEOUT") {
        throw new AppError(
          HttpStatus.GATEWAY_TIMEOUT,
          ErrorCodes.TTS_GENERATION_FAILED,
          "语音生成超时。",
        );
      }
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TTS_GENERATION_FAILED,
        error.message,
      );
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ErrorCodes.TTS_GENERATION_FAILED,
      "语音生成失败",
    );
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.PROJECT_NOT_FOUND, "项目不存在");
    }
    return project;
  }
}

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}
