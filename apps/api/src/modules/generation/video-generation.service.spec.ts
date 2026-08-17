import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppError, ErrorCodes } from "../../common/app-error";
import { AiProviderError } from "../ai/ai.errors";
import { VideoGenerationService } from "./video-generation.service";

const PREVIEW = {
  url: "https://cdn.example/preview.mp4",
  mimeType: "video/mp4",
  width: 1280,
  height: 720,
  durationSeconds: 5,
};

function createService(options?: {
  mode?: "TEXT_TO_VIDEO" | "IMAGE_TO_VIDEO";
  generate?: () => Promise<unknown>;
  resolveError?: AppError;
  shotProjectId?: string;
  missingShot?: boolean;
  sourceAsset?: {
    id: string;
    projectId: string;
    type?: string;
    status?: string;
    url?: string | null;
    storageKey?: string | null;
    linkedShotId?: string | null;
  } | null;
  defaultSource?: boolean;
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
    usage: { durationMs: 2100 } as Record<string, unknown>,
  };
  const shot = options?.missingShot
    ? null
    : {
        id: "shot-1",
        videoPrompt: "沈星河抬头看星裂",
        imagePrompt: "废墟立像",
        negativePrompt: "blur",
        visualDescription: "废墟与星裂",
        action: "迈步",
        dialogue: "……",
        durationSeconds: 5,
        cameraMovement: "STATIC",
        cameraAngle: "EYE_LEVEL",
        characterIds: [],
        storyboard: {
          projectId: options?.shotProjectId ?? "proj-1",
          version: 2,
        },
      };
  const source = options?.sourceAsset;
  const prisma = {
    project: { findUnique: async () => ({ id: "proj-1" }) },
    storyboardShot: { findUnique: async () => shot },
    character: { findMany: async () => [] },
    asset: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (!source || source.id !== where.id) {
          return null;
        }
        return {
          id: source.id,
          projectId: source.projectId,
          type: source.type ?? "IMAGE",
          status: source.status ?? "READY",
          url: source.url ?? "https://cdn.example/frame.png",
          storageKey: source.storageKey ?? null,
        };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdAssets.push(data);
        return data;
      },
    },
    storyboardShotAsset: {
      findFirst: async () => {
        if (!options?.defaultSource || !source) {
          return null;
        }
        return { asset: { id: source.id, type: "IMAGE", status: "READY" } };
      },
      findUnique: async () => {
        if (!source || source.linkedShotId === null) {
          return null;
        }
        return { shotId: "shot-1", assetId: source.id };
      },
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
      findUnique: async () => ({ usage: taskState.usage }),
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
    id: "prov-v",
    name: "Video Provider",
    kind: "OPENAI_COMPATIBLE",
    model: "video-1",
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
    generateVideoWith: async (_resolved: unknown, payload: unknown) => {
      generateCalls.push({ kind: "VIDEO", payload });
      if (options?.generate) {
        return options.generate();
      }
      return PREVIEW;
    },
    generateImageToVideoWith: async (_resolved: unknown, payload: unknown) => {
      generateCalls.push({ kind: "IMAGE_TO_VIDEO", payload });
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
      type: createdTasks[0]?.type ?? "VIDEO",
      capability: createdTasks[0]?.capability ?? "VIDEO",
      status: taskState.status,
      output: taskState.output,
      input:
        (createdTasks[0]?.input as Record<string, unknown> | undefined) ?? {
          shotId: "shot-1",
          prompt: "沈星河抬头看星裂",
        },
      appliedAt: taskState.appliedAt,
      provider: "Video Provider",
      model: "video-1",
      usage: taskState.usage,
      error: taskState.error,
    }),
  };
  const storage = {
    saveFromBase64: async ({ assetId }: { assetId: string }) => ({
      storageKey: `assets/proj-1/${assetId}/video.mp4`,
      url: `/projects/proj-1/assets/${assetId}/file`,
      mimeType: "video/mp4",
      sizeBytes: 24,
    }),
    saveFromUrl: async ({ assetId }: { assetId: string }) => ({
      storageKey: `assets/proj-1/${assetId}/video.mp4`,
      url: `/projects/proj-1/assets/${assetId}/file`,
      mimeType: "video/mp4",
      sizeBytes: 24,
    }),
    delete: async (storageKey: string) => {
      deletedKeys.push(storageKey);
    },
    resolvePath: () => "/tmp/missing-source.png",
  };
  const service = new VideoGenerationService(
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

describe("VideoGenerationService", () => {
  it("resolves VIDEO capability and does not create assets on preview", async () => {
    const { service, createdTasks, createdAssets, generateCalls, taskState } =
      createService();
    const task = await service.createVideoGeneration("proj-1", { shotId: "shot-1" });
    expect(createdTasks[0]?.type).toBe("VIDEO");
    expect(createdTasks[0]?.capability).toBe("VIDEO");
    expect(generateCalls[0]).toMatchObject({ kind: "VIDEO" });
    expect(task.status).toBe("SUCCEEDED");
    expect(createdAssets).toHaveLength(0);
    expect(JSON.stringify(task)).not.toContain("sk-secret-key");
    expect(taskState.usage.sourceShotId).toBe("shot-1");
    expect(taskState.usage.outputAssetCount).toBe(0);
  });

  it("resolves IMAGE_TO_VIDEO and records sourceAssetId", async () => {
    const { service, createdTasks, generateCalls } = createService({
      sourceAsset: {
        id: "img-1",
        projectId: "proj-1",
        linkedShotId: "shot-1",
      },
    });
    const task = await service.createImageToVideoGeneration("proj-1", {
      shotId: "shot-1",
      sourceAssetId: "img-1",
    });
    expect(createdTasks[0]?.type).toBe("IMAGE_TO_VIDEO");
    expect(createdTasks[0]?.capability).toBe("IMAGE_TO_VIDEO");
    expect(generateCalls[0]).toMatchObject({ kind: "IMAGE_TO_VIDEO" });
    expect((createdTasks[0]?.input as { sourceAssetId?: string }).sourceAssetId).toBe(
      "img-1",
    );
    expect(task.status).toBe("SUCCEEDED");
  });

  it("maps missing VIDEO provider without calling AI", async () => {
    const { service, createdTasks, generateCalls } = createService({
      resolveError: new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
        "尚未配置",
      ),
    });
    await expect(
      service.createVideoGeneration("proj-1", { shotId: "shot-1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.VIDEO_PROVIDER_NOT_CONFIGURED });
    expect(createdTasks).toHaveLength(0);
    expect(generateCalls).toHaveLength(0);
  });

  it("maps missing IMAGE_TO_VIDEO provider without calling AI", async () => {
    const { service, generateCalls } = createService({
      sourceAsset: { id: "img-1", projectId: "proj-1", linkedShotId: "shot-1" },
      resolveError: new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
        "尚未配置",
      ),
    });
    await expect(
      service.createImageToVideoGeneration("proj-1", {
        shotId: "shot-1",
        sourceAssetId: "img-1",
      }),
    ).rejects.toMatchObject({
      code: ErrorCodes.IMAGE_TO_VIDEO_PROVIDER_NOT_CONFIGURED,
    });
    expect(generateCalls).toHaveLength(0);
  });

  it("maps provider capability mismatch without calling AI", async () => {
    const { service, generateCalls } = createService({
      resolveError: new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED,
        "no",
      ),
    });
    await expect(
      service.createVideoGeneration("proj-1", { shotId: "shot-1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.VIDEO_CAPABILITY_NOT_SUPPORTED });
    expect(generateCalls).toHaveLength(0);
  });

  it("rethrows provider disabled / missing key / model disabled without calling AI", async () => {
    for (const code of [
      ErrorCodes.PROVIDER_DISABLED,
      ErrorCodes.PROVIDER_API_KEY_MISSING,
      ErrorCodes.MODEL_DISABLED,
      ErrorCodes.MODEL_CAPABILITY_NOT_SUPPORTED,
    ] as const) {
      const { service, generateCalls } = createService({
        resolveError: new AppError(HttpStatus.BAD_REQUEST, code, "blocked"),
      });
      await expect(
        service.createVideoGeneration("proj-1", { shotId: "shot-1" }),
      ).rejects.toMatchObject({ code });
      expect(generateCalls).toHaveLength(0);
    }
  });

  it("rejects a shot from another project", async () => {
    const { service, generateCalls } = createService({ shotProjectId: "other" });
    await expect(
      service.createVideoGeneration("proj-1", { shotId: "shot-1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.SHOT_PROJECT_MISMATCH });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects a missing shot", async () => {
    const { service } = createService({ missingShot: true });
    await expect(
      service.createVideoGeneration("proj-1", { shotId: "missing" }),
    ).rejects.toMatchObject({ code: ErrorCodes.STORYBOARD_SHOT_NOT_FOUND });
  });

  it("requires a source image for IMAGE_TO_VIDEO", async () => {
    const { service, generateCalls } = createService();
    await expect(
      service.createImageToVideoGeneration("proj-1", { shotId: "shot-1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.SOURCE_IMAGE_REQUIRED });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects a source image from another project", async () => {
    const { service, generateCalls } = createService({
      sourceAsset: { id: "img-1", projectId: "other", linkedShotId: "shot-1" },
    });
    await expect(
      service.createImageToVideoGeneration("proj-1", {
        shotId: "shot-1",
        sourceAssetId: "img-1",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.SOURCE_IMAGE_PROJECT_MISMATCH });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects a source image that is not linked to the shot", async () => {
    const { service, generateCalls } = createService({
      sourceAsset: { id: "img-1", projectId: "proj-1", linkedShotId: null },
    });
    await expect(
      service.createImageToVideoGeneration("proj-1", {
        shotId: "shot-1",
        sourceAssetId: "img-1",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.SOURCE_IMAGE_SHOT_MISMATCH });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects a source image that is not READY", async () => {
    const { service, generateCalls } = createService({
      sourceAsset: {
        id: "img-1",
        projectId: "proj-1",
        status: "PENDING",
        linkedShotId: "shot-1",
      },
    });
    await expect(
      service.createImageToVideoGeneration("proj-1", {
        shotId: "shot-1",
        sourceAssetId: "img-1",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.SOURCE_IMAGE_NOT_READY });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects a missing source image", async () => {
    const { service } = createService({ sourceAsset: null });
    await expect(
      service.createImageToVideoGeneration("proj-1", {
        shotId: "shot-1",
        sourceAssetId: "missing",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.SOURCE_IMAGE_NOT_FOUND });
  });

  it("does not create assets when generation fails and sanitizes secrets", async () => {
    const { service, createdAssets, taskState } = createService({
      generate: async () => {
        throw new AiProviderError("boom sk-secret-key", "UNAVAILABLE");
      },
    });
    const task = await service.createVideoGeneration("proj-1", { shotId: "shot-1" });
    expect(task.status).toBe("FAILED");
    expect(createdAssets).toHaveLength(0);
    expect(String(taskState.error)).not.toContain("sk-secret-key");
  });

  it("apply creates a VIDEO Asset and StoryboardShotAsset as final", async () => {
    const ctx = createService();
    await ctx.service.createVideoGeneration("proj-1", { shotId: "shot-1" });
    const applied = await ctx.service.apply("proj-1", "task-1");
    expect(ctx.createdAssets).toHaveLength(1);
    expect(ctx.createdAssets[0]?.type).toBe("VIDEO");
    expect(ctx.createdLinks[0]?.isPrimary).toBe(true);
    expect(ctx.createdLinks[0]?.role).toBe("FINAL");
    expect(applied.appliedAt).toBeInstanceOf(Date);
  });

  it("keeps the old final video when applying a new one", async () => {
    const ctx = createService();
    ctx.createdLinks.push({
      shotId: "shot-1",
      assetId: "old-asset",
      role: "FINAL",
      isPrimary: true,
    });
    await ctx.service.createVideoGeneration("proj-1", { shotId: "shot-1" });
    await ctx.service.apply("proj-1", "task-1");
    expect(ctx.createdLinks[0]?.assetId).toBe("old-asset");
    expect(ctx.createdLinks[0]?.isPrimary).toBe(false);
    expect(ctx.createdLinks[1]?.isPrimary).toBe(true);
  });

  it("rejects a second apply", async () => {
    const ctx = createService();
    await ctx.service.createVideoGeneration("proj-1", { shotId: "shot-1" });
    await ctx.service.apply("proj-1", "task-1");
    await expect(ctx.service.apply("proj-1", "task-1")).rejects.toMatchObject({
      code: ErrorCodes.GENERATION_ALREADY_APPLIED,
    });
  });

  it("rolls back files when the apply transaction fails", async () => {
    const ctx = createService({ transactionError: new Error("db down") });
    await ctx.service.createVideoGeneration("proj-1", { shotId: "shot-1" });
    await expect(ctx.service.apply("proj-1", "task-1")).rejects.toMatchObject({
      code: ErrorCodes.VIDEO_ASSET_APPLY_FAILED,
    });
    expect(ctx.deletedKeys.length).toBeGreaterThan(0);
    expect(ctx.taskState.appliedAt).toBeNull();
  });

  it("creates a new task on regenerate without deleting history", async () => {
    const { service, createdTasks } = createService();
    await service.createVideoGeneration("proj-1", { shotId: "shot-1" });
    await service.createVideoGeneration("proj-1", { shotId: "shot-1" });
    expect(createdTasks).toHaveLength(2);
  });

  it("uses the shot final image when sourceAssetId is omitted", async () => {
    const { service, createdTasks } = createService({
      defaultSource: true,
      sourceAsset: { id: "img-final", projectId: "proj-1", linkedShotId: "shot-1" },
    });
    await service.createImageToVideoGeneration("proj-1", { shotId: "shot-1" });
    expect((createdTasks[0]?.input as { sourceAssetId?: string }).sourceAssetId).toBe(
      "img-final",
    );
  });
});
