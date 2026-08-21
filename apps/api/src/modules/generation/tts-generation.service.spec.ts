import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppError, ErrorCodes } from "../../common/app-error";
import { AiProviderError } from "../ai/ai.errors";
import { TtsGenerationService } from "./tts-generation.service";

const PREVIEW = {
  base64: Buffer.from("ID3fake").toString("base64"),
  mimeType: "audio/mpeg",
  format: "mp3",
  durationSeconds: 1.2,
};

function createService(options?: {
  generate?: () => Promise<unknown>;
  resolveError?: AppError;
  blockType?: string;
  blockContent?: string;
  missingBlock?: boolean;
  episodeProjectId?: string;
  characterProjectId?: string;
  voiceProfile?: { voiceId?: string } | null;
  appliedAt?: Date | null;
  transactionError?: Error;
}) {
  const createdTasks: Array<Record<string, unknown>> = [];
  const createdAssets: Array<Record<string, unknown>> = [];
  const createdLinks: Array<Record<string, unknown>> = [];
  const deletedKeys: string[] = [];
  const generateCalls: unknown[] = [];
  const resolvedCapabilities: string[] = [];
  const taskState = {
    status: "PENDING",
    output: null as unknown,
    error: null as string | null,
    appliedAt: options?.appliedAt ?? null,
    usage: { durationMs: 900 } as Record<string, unknown>,
  };
  const block = options?.missingBlock
    ? null
    : {
        id: "block-1",
        content: options?.blockContent ?? "你是谁？",
        type: options?.blockType ?? "DIALOGUE",
        characterId: "char-1",
        scene: { scriptId: "script-1", title: "问天宗" },
      };
  const prisma = {
    project: {
      findUnique: async () => ({ id: "proj-1", name: "星河碰撞" }),
    },
    episode: {
      findUnique: async () => ({
        id: "ep-1",
        title: "E01",
        projectId: options?.episodeProjectId ?? "proj-1",
      }),
    },
    script: {
      findUnique: async () => ({
        id: "script-1",
        projectId: "proj-1",
        episodeId: "ep-1",
      }),
    },
    scriptBlock: {
      findUnique: async () => block,
    },
    character: {
      findUnique: async () => ({
        id: "char-1",
        name: "沈星河",
        projectId: options?.characterProjectId ?? "proj-1",
        voiceProfile: options?.voiceProfile === undefined
          ? { voiceId: "xinghe" }
          : options.voiceProfile,
      }),
    },
    asset: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdAssets.push(data);
        return data;
      },
    },
    scriptBlockAsset: {
      count: async () => createdLinks.length,
      updateMany: async () => {
        createdLinks.forEach((item) => {
          item.isPrimary = false;
        });
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdLinks.push({ ...data });
        return data;
      },
    },
    generationTask: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdTasks.push(data);
        return { id: `task-${createdTasks.length}`, ...data };
      },
      findMany: async () => [],
      findUnique: async () => ({ usage: taskState.usage, output: taskState.output }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        if (data.appliedAt) {
          taskState.appliedAt = data.appliedAt as Date;
        }
        if (data.usage) {
          taskState.usage = data.usage as Record<string, unknown>;
        }
        return { id: "task-1" };
      },
    },
    $transaction: async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      if (options?.transactionError) {
        throw options.transactionError;
      }
      return fn(prisma);
    },
  };
  const resolved = {
    source: "project" as const,
    id: "prov-tts",
    name: "TTS Provider",
    kind: "OPENAI_COMPATIBLE",
    model: "tts-1",
    apiKey: "sk-secret-key",
  };
  const ai = {
    resolveForCapability: async (_projectId: string, capability: string) => {
      resolvedCapabilities.push(capability);
      if (options?.resolveError) {
        throw options.resolveError;
      }
      return resolved;
    },
    generateSpeechWith: async (_resolved: unknown, payload: unknown) => {
      generateCalls.push(payload);
      if (options?.generate) {
        return options.generate();
      }
      return PREVIEW;
    },
  };
  const executor = {
    run: async (_id: string, work: () => Promise<unknown>, secret?: string) => {
      expect(secret).toBe("sk-secret-key");
      try {
        const output = await work();
        taskState.status = "SUCCEEDED";
        taskState.output = output;
        return output;
      } catch (error) {
        taskState.status = "FAILED";
        const message = error instanceof Error ? error.message : "fail";
        taskState.error = message.split("sk-secret-key").join("[redacted]");
        throw error;
      }
    },
    getTask: async () => ({
      id: createdTasks[0] ? `task-${createdTasks.length}` : "task-1",
      projectId: "proj-1",
      type: createdTasks[0]?.type ?? "TTS",
      capability: createdTasks[0]?.capability ?? "TTS",
      status: taskState.status,
      output: taskState.output,
      input:
        (createdTasks[0]?.input as Record<string, unknown> | undefined) ?? {
          episodeId: "ep-1",
          scriptBlockId: "block-1",
          text: "你是谁？",
          voiceId: "xinghe",
        },
      appliedAt: taskState.appliedAt,
      provider: "TTS Provider",
      model: "tts-1",
      usage: taskState.usage,
      error: taskState.error,
    }),
  };
  const storage = {
    saveFromBase64: async ({ assetId }: { assetId: string }) => ({
      storageKey: `assets/proj-1/${assetId}/audio.mp3`,
      url: `/projects/proj-1/assets/${assetId}/file`,
      mimeType: "audio/mpeg",
      sizeBytes: 8,
    }),
    saveFromUrl: async ({ assetId }: { assetId: string }) => ({
      storageKey: `assets/proj-1/${assetId}/audio.mp3`,
      url: `/projects/proj-1/assets/${assetId}/file`,
      mimeType: "audio/mpeg",
      sizeBytes: 8,
    }),
    delete: async (storageKey: string) => {
      deletedKeys.push(storageKey);
    },
  };
  const service = new TtsGenerationService(
    prisma as never,
    ai as never,
    executor as never,
    storage as never,
  );
  return {
    service,
    createdTasks,
    createdAssets,
    createdLinks,
    generateCalls,
    deletedKeys,
    taskState,
    resolvedCapabilities,
  };
}

describe("TtsGenerationService", () => {
  it("resolves TTS capability and does not create assets on preview", async () => {
    const { service, createdTasks, createdAssets, generateCalls, resolvedCapabilities } =
      createService();
    const task = await service.createTtsGeneration("proj-1", {
      episodeId: "ep-1",
      scriptBlockId: "block-1",
    });
    expect(createdTasks[0]?.type).toBe("TTS");
    expect(createdTasks[0]?.capability).toBe("TTS");
    expect(resolvedCapabilities).toEqual(["TTS"]);
    expect(generateCalls[0]).toMatchObject({ text: "你是谁？", voice: "xinghe" });
    expect(task.status).toBe("SUCCEEDED");
    expect(createdAssets).toHaveLength(0);
    expect(JSON.stringify(task)).not.toContain("sk-secret-key");
    expect(task.usage?.characterCount).toBe(4);
  });

  it("rejects non-dialogue blocks without calling AI", async () => {
    const { service, generateCalls } = createService({ blockType: "ACTION" });
    await expect(
      service.createTtsGeneration("proj-1", {
        episodeId: "ep-1",
        scriptBlockId: "block-1",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.TTS_SOURCE_NOT_DIALOGUE });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects empty text", async () => {
    const { service, generateCalls } = createService({ blockContent: "   " });
    await expect(
      service.createTtsGeneration("proj-1", {
        episodeId: "ep-1",
        scriptBlockId: "block-1",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.TTS_TEXT_EMPTY });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects oversized text without auto-splitting", async () => {
    const { service, generateCalls } = createService({
      blockContent: "你".repeat(4001),
    });
    await expect(
      service.createTtsGeneration("proj-1", {
        episodeId: "ep-1",
        scriptBlockId: "block-1",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.TTS_TEXT_TOO_LONG });
    expect(generateCalls).toHaveLength(0);
  });

  it("requires a voiceId when profile and request are both empty", async () => {
    const { service, generateCalls } = createService({ voiceProfile: {} });
    await expect(
      service.createTtsGeneration("proj-1", {
        episodeId: "ep-1",
        scriptBlockId: "block-1",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.TTS_VOICE_REQUIRED });
    expect(generateCalls).toHaveLength(0);
  });

  it("maps missing TTS provider without calling AI", async () => {
    const { service, createdTasks, generateCalls } = createService({
      resolveError: new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
        "尚未配置",
      ),
    });
    await expect(
      service.createTtsGeneration("proj-1", {
        episodeId: "ep-1",
        scriptBlockId: "block-1",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.TTS_PROVIDER_NOT_CONFIGURED });
    expect(createdTasks).toHaveLength(0);
    expect(generateCalls).toHaveLength(0);
  });

  it("does not fall back to CHAT or IMAGE", async () => {
    const { service, resolvedCapabilities } = createService();
    await service.createTtsGeneration("proj-1", {
      episodeId: "ep-1",
      scriptBlockId: "block-1",
    });
    expect(resolvedCapabilities).toEqual(["TTS"]);
  });

  it("rejects a dialogue from another project", async () => {
    const { service, generateCalls } = createService({ episodeProjectId: "other" });
    await expect(
      service.createTtsGeneration("proj-1", {
        episodeId: "ep-1",
        scriptBlockId: "block-1",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.TTS_ASSET_PROJECT_MISMATCH });
    expect(generateCalls).toHaveLength(0);
  });

  it("sanitizes provider errors", async () => {
    const { service, taskState } = createService({
      generate: async () => {
        throw new AiProviderError("fail sk-secret-key", "UNAVAILABLE");
      },
    });
    const task = await service.createTtsGeneration("proj-1", {
      episodeId: "ep-1",
      scriptBlockId: "block-1",
    });
    expect(task.status).toBe("FAILED");
    expect(taskState.error).not.toContain("sk-secret-key");
  });

  it("applies preview into AUDIO asset and ScriptBlockAsset", async () => {
    const ctx = createService();
    await ctx.service.createTtsGeneration("proj-1", {
      episodeId: "ep-1",
      scriptBlockId: "block-1",
    });
    const applied = await ctx.service.apply("proj-1", "task-1");
    expect(ctx.createdAssets[0]?.type).toBe("AUDIO");
    expect(ctx.createdLinks[0]).toMatchObject({
      role: "FINAL",
      isPrimary: true,
      scriptBlockId: "block-1",
    });
    expect(applied.appliedAt).toBeInstanceOf(Date);
  });

  it("rejects duplicate apply", async () => {
    const ctx = createService();
    await ctx.service.createTtsGeneration("proj-1", {
      episodeId: "ep-1",
      scriptBlockId: "block-1",
    });
    await ctx.service.apply("proj-1", "task-1");
    await expect(ctx.service.apply("proj-1", "task-1")).rejects.toMatchObject({
      code: ErrorCodes.GENERATION_ALREADY_APPLIED,
    });
  });

  it("deletes persisted files when apply transaction fails", async () => {
    const ctx = createService({ transactionError: new Error("db") });
    await ctx.service.createTtsGeneration("proj-1", {
      episodeId: "ep-1",
      scriptBlockId: "block-1",
    });
    await expect(ctx.service.apply("proj-1", "task-1")).rejects.toMatchObject({
      code: ErrorCodes.TTS_APPLY_FAILED,
    });
    expect(ctx.deletedKeys.length).toBeGreaterThan(0);
    expect(ctx.createdAssets).toHaveLength(0);
  });
});
