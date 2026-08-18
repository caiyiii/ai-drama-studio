import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppError, ErrorCodes } from "../../common/app-error";
import { AiProviderError } from "../ai/ai.errors";
import { EpisodeAudioGenerationService } from "./episode-audio-generation.service";

const PREVIEW = {
  base64: Buffer.from("ID3fake").toString("base64"),
  mimeType: "audio/mpeg",
  format: "mp3",
  durationSeconds: 12,
};

function createService(options?: {
  generate?: () => Promise<unknown>;
  resolveError?: AppError;
  episodeProjectId?: string;
  seasonProjectId?: string;
  missingEpisode?: boolean;
  appliedAt?: Date | null;
  transactionError?: Error;
  sceneOk?: boolean;
  shotOk?: boolean;
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
  const prisma = {
    project: {
      findUnique: async () => ({ id: "proj-1", name: "星河碰撞" }),
    },
    episode: {
      findUnique: async () =>
        options?.missingEpisode
          ? null
          : {
              id: "ep-1",
              title: "E01",
              projectId: options?.episodeProjectId ?? "proj-1",
              season: { projectId: options?.seasonProjectId ?? "proj-1" },
            },
    },
    scene: {
      findUnique: async () =>
        options?.sceneOk === false
          ? { id: "scene-x", script: { episodeId: "other", projectId: "other" } }
          : {
              id: "scene-1",
              title: "撞击",
              script: { episodeId: "ep-1", projectId: "proj-1" },
            },
    },
    storyboardShot: {
      findUnique: async () =>
        options?.shotOk === false
          ? {
              id: "shot-x",
              storyboard: { episodeId: "other", projectId: "other" },
            }
          : {
              id: "shot-1",
              visualDescription: "飞船撞击",
              action: "撞击",
              storyboard: { episodeId: "ep-1", projectId: "proj-1" },
            },
    },
    asset: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdAssets.push(data);
        return data;
      },
    },
    episodeAudioAsset: {
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
    id: "prov-music",
    name: "Music Provider",
    kind: "OPENAI_COMPATIBLE",
    model: "music-1",
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
    generateMusicWith: async (_resolved: unknown, payload: unknown) => {
      generateCalls.push(payload);
      if (options?.generate) {
        return options.generate();
      }
      return PREVIEW;
    },
    generateSfxWith: async (_resolved: unknown, payload: unknown) => {
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
      type: createdTasks[0]?.type ?? "MUSIC",
      capability: createdTasks[0]?.capability ?? "MUSIC",
      status: taskState.status,
      output: taskState.output,
      input:
        (createdTasks[0]?.input as Record<string, unknown> | undefined) ?? {
          episodeId: "ep-1",
          prompt: "theme",
        },
      appliedAt: taskState.appliedAt,
      provider: "Music Provider",
      model: "music-1",
      usage: taskState.usage,
      error: taskState.error,
    }),
  };
  const storage = {
    saveFromBase64: async ({ assetId, fileStem }: { assetId: string; fileStem?: string }) => ({
      storageKey: `assets/proj-1/${assetId}/${fileStem || "audio"}.mp3`,
      url: `/projects/proj-1/assets/${assetId}/file`,
      mimeType: "audio/mpeg",
      sizeBytes: 8,
    }),
    saveFromUrl: async ({ assetId, fileStem }: { assetId: string; fileStem?: string }) => ({
      storageKey: `assets/proj-1/${assetId}/${fileStem || "audio"}.mp3`,
      url: `/projects/proj-1/assets/${assetId}/file`,
      mimeType: "audio/mpeg",
      sizeBytes: 8,
    }),
    copy: async ({
      assetId,
      fileStem,
    }: {
      assetId: string;
      fileStem?: string;
    }) => ({
      storageKey: `assets/proj-1/${assetId}/${fileStem || "audio"}.mp3`,
      url: `/projects/proj-1/assets/${assetId}/file`,
      mimeType: "audio/mpeg",
      sizeBytes: 8,
    }),
    delete: async (storageKey: string) => {
      deletedKeys.push(storageKey);
    },
    resolvePath: (key: string) => key,
  };
  const contextBuilder = {
    buildMusicContext: async () => ({
      projectName: "星河碰撞",
      episodeTitle: "第一次接触",
      storyBibleTone: "神秘",
    }),
    buildSfxContext: async () => ({
      projectName: "星河碰撞",
      episodeTitle: "第一次接触",
      shotAction: "撞击",
    }),
  };
  const service = new EpisodeAudioGenerationService(
    prisma as never,
    ai as never,
    executor as never,
    storage as never,
    contextBuilder as never,
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

describe("EpisodeAudioGenerationService", () => {
  it("resolves MUSIC capability and does not create assets on preview", async () => {
    const { service, createdTasks, createdAssets, resolvedCapabilities } = createService();
    const task = await service.createMusicGeneration("proj-1", {
      episodeId: "ep-1",
      prompt: "epic theme",
      durationSeconds: 30,
    });
    expect(createdTasks[0]?.type).toBe("MUSIC");
    expect(createdTasks[0]?.capability).toBe("MUSIC");
    expect(resolvedCapabilities).toEqual(["MUSIC"]);
    expect(task.status).toBe("SUCCEEDED");
    expect(createdAssets).toHaveLength(0);
    expect(JSON.stringify(task)).not.toContain("sk-secret-key");
    expect((task.output as { previewStorageKey?: string }).previewStorageKey).toBeTruthy();
    expect((task.output as { base64?: string }).base64).toBeUndefined();
  });

  it("maps missing MUSIC provider without calling AI", async () => {
    const { service, createdTasks, generateCalls } = createService({
      resolveError: new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
        "尚未配置",
      ),
    });
    await expect(
      service.createMusicGeneration("proj-1", {
        episodeId: "ep-1",
        prompt: "theme",
        durationSeconds: 30,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.MUSIC_PROVIDER_NOT_CONFIGURED });
    expect(createdTasks).toHaveLength(0);
    expect(generateCalls).toHaveLength(0);
  });

  it("does not fall back MUSIC to CHAT or TTS", async () => {
    const { service, resolvedCapabilities } = createService();
    await service.createMusicGeneration("proj-1", {
      episodeId: "ep-1",
      prompt: "theme",
      durationSeconds: 30,
    });
    expect(resolvedCapabilities).toEqual(["MUSIC"]);
  });

  it("rejects invalid music duration", async () => {
    const { service, generateCalls } = createService();
    await expect(
      service.createMusicGeneration("proj-1", {
        episodeId: "ep-1",
        prompt: "theme",
        durationSeconds: 900,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_DURATION });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects a cross-project episode", async () => {
    const { service, generateCalls } = createService({ episodeProjectId: "other" });
    await expect(
      service.createMusicGeneration("proj-1", {
        episodeId: "ep-1",
        prompt: "theme",
        durationSeconds: 30,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.EPISODE_NOT_IN_PROJECT });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects a missing episode", async () => {
    const { service } = createService({ missingEpisode: true });
    await expect(
      service.createMusicGeneration("proj-1", {
        episodeId: "missing",
        prompt: "theme",
        durationSeconds: 30,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.EPISODE_NOT_FOUND });
  });

  it("sanitizes provider errors", async () => {
    const { service, taskState } = createService({
      generate: async () => {
        throw new AiProviderError("fail sk-secret-key", "UNAVAILABLE");
      },
    });
    const task = await service.createMusicGeneration("proj-1", {
      episodeId: "ep-1",
      prompt: "theme",
      durationSeconds: 30,
    });
    expect(task.status).toBe("FAILED");
    expect(taskState.error).not.toContain("sk-secret-key");
  });

  it("applies preview into AUDIO asset and EpisodeAudioAsset", async () => {
    const ctx = createService();
    await ctx.service.createMusicGeneration("proj-1", {
      episodeId: "ep-1",
      prompt: "theme",
      durationSeconds: 30,
      title: "First Contact Theme",
    });
    const applied = await ctx.service.apply("proj-1", "task-1");
    expect(ctx.createdAssets[0]?.type).toBe("AUDIO");
    expect(ctx.createdLinks[0]).toMatchObject({
      role: "MUSIC",
      isPrimary: true,
      episodeId: "ep-1",
    });
    expect(applied.appliedAt).toBeInstanceOf(Date);
  });

  it("rejects duplicate apply", async () => {
    const ctx = createService();
    await ctx.service.createMusicGeneration("proj-1", {
      episodeId: "ep-1",
      prompt: "theme",
      durationSeconds: 30,
    });
    await ctx.service.apply("proj-1", "task-1");
    await expect(ctx.service.apply("proj-1", "task-1")).rejects.toMatchObject({
      code: ErrorCodes.GENERATION_ALREADY_APPLIED,
    });
  });

  it("deletes persisted files when apply transaction fails", async () => {
    const ctx = createService({ transactionError: new Error("db") });
    await ctx.service.createMusicGeneration("proj-1", {
      episodeId: "ep-1",
      prompt: "theme",
      durationSeconds: 30,
    });
    await expect(ctx.service.apply("proj-1", "task-1")).rejects.toMatchObject({
      code: ErrorCodes.AUDIO_ASSET_APPLY_FAILED,
    });
    expect(ctx.deletedKeys.length).toBeGreaterThan(0);
    expect(ctx.createdAssets).toHaveLength(0);
  });

  it("resolves SFX capability without TTS fallback", async () => {
    const { service, createdTasks, createdAssets, resolvedCapabilities } = createService();
    const task = await service.createSfxGeneration("proj-1", {
      episodeId: "ep-1",
      prompt: "explosion",
      durationSeconds: 2,
      category: "explosion",
    });
    expect(createdTasks[0]?.type).toBe("SFX");
    expect(createdTasks[0]?.capability).toBe("SFX");
    expect(resolvedCapabilities).toEqual(["SFX"]);
    expect(createdAssets).toHaveLength(0);
    expect(task.status).toBe("SUCCEEDED");
  });

  it("maps missing SFX provider", async () => {
    const { service, generateCalls } = createService({
      resolveError: new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
        "尚未配置",
      ),
    });
    await expect(
      service.createSfxGeneration("proj-1", {
        episodeId: "ep-1",
        prompt: "boom",
        durationSeconds: 1,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.SFX_PROVIDER_NOT_CONFIGURED });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects invalid sfx sceneId", async () => {
    const { service, generateCalls } = createService({ sceneOk: false });
    await expect(
      service.createSfxGeneration("proj-1", {
        episodeId: "ep-1",
        prompt: "boom",
        durationSeconds: 1,
        sceneId: "scene-x",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.STORYBOARD_INVALID_SCENE });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects invalid sfx shotId", async () => {
    const { service, generateCalls } = createService({ shotOk: false });
    await expect(
      service.createSfxGeneration("proj-1", {
        episodeId: "ep-1",
        prompt: "boom",
        durationSeconds: 1,
        shotId: "shot-x",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.STORYBOARD_SHOT_NOT_FOUND });
    expect(generateCalls).toHaveLength(0);
  });
});
