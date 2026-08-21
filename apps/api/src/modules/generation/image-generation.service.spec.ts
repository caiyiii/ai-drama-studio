import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppError, ErrorCodes } from "../../common/app-error";
import { AiProviderError } from "../ai/ai.errors";
import { ImageGenerationService } from "./image-generation.service";

const PREVIEW = {
  images: [
    {
      base64: "aaa",
      mimeType: "image/png",
      width: 1024,
      height: 576,
      seed: 7,
    },
  ],
  requestedCount: 1,
};

function createService(options?: {
  generate?: () => Promise<unknown>;
  resolveError?: AppError;
  shotProjectId?: string;
  missingShot?: boolean;
  assets?: Array<{ id: string; projectId: string; status?: string }>;
  appliedAt?: Date | null;
  transactionError?: Error;
}) {
  const createdTasks: Array<Record<string, unknown>> = [];
  const createdAssets: Array<Record<string, unknown>> = [];
  const createdLinks: Array<Record<string, unknown>> = [];
  const deletedKeys: string[] = [];
  const generateCalls: unknown[] = [];
  const taskState = {
    status: "PENDING",
    output: null as unknown,
    error: null as string | null,
    appliedAt: options?.appliedAt ?? null,
    usage: { durationMs: 1500 } as Record<string, unknown>,
  };
  const shot = options?.missingShot
    ? null
    : {
        id: "shot-1",
        imagePrompt: "沈星河站在废墟中，夜空裂开",
        negativePrompt: "lowres",
        visualDescription: "废墟与星裂",
        composition: "中心构图",
        lighting: "冷蓝",
        mood: "肃杀",
        visualStyle: "电影感",
        cameraAngle: "EYE_LEVEL",
        shotSize: "WIDE",
        cameraMovement: "STATIC",
        location: "问天宗",
        storyboard: { projectId: options?.shotProjectId ?? "proj-1" },
      };
  const prisma = {
    project: { findUnique: async () => ({ id: "proj-1" }) },
    storyboardShot: {
      findUnique: async () => shot,
    },
    asset: {
      findMany: async ({ where }: { where: { id?: { in: string[] } } }) =>
        (options?.assets ?? []).filter((item) =>
          where.id?.in ? where.id.in.includes(item.id) : true,
        ),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdAssets.push(data);
        return data;
      },
    },
    storyboardShotAsset: {
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
    id: "prov-1",
    name: "Flux Provider",
    kind: "OPENAI_COMPATIBLE",
    model: "flux-dev",
    apiKey: "sk-secret-key",
  };
  const ai = {
    resolveForCapability: async (_projectId: string, capability: string) => {
      expect(capability).toBe("IMAGE");
      if (options?.resolveError) {
        throw options.resolveError;
      }
      return resolved;
    },
    generateImageWith: async (_resolved: unknown, payload: unknown) => {
      generateCalls.push(payload);
      if (options?.generate) {
        return options.generate();
      }
      return PREVIEW;
    },
  };
  const executor = {
    run: async (
      _id: string,
      work: () => Promise<unknown>,
      secret?: string,
    ) => {
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
      type: "IMAGE",
      status: taskState.status,
      output: taskState.output,
      input:
        (createdTasks[0]?.input as Record<string, unknown> | undefined) ?? {
          shotId: "shot-1",
          prompt: "沈星河站在废墟中，夜空裂开",
        },
      appliedAt: taskState.appliedAt,
      provider: "Flux Provider",
      model: "flux-dev",
      usage: taskState.usage,
      error: taskState.error,
    }),
  };
  const storage = {
    saveFromBase64: async ({ assetId }: { assetId: string }) => ({
      storageKey: `assets/proj-1/${assetId}/original.png`,
      url: `/projects/proj-1/assets/${assetId}/file`,
      mimeType: "image/png",
      sizeBytes: 12,
    }),
    saveFromUrl: async ({ assetId }: { assetId: string }) => ({
      storageKey: `assets/proj-1/${assetId}/original.png`,
      url: `/projects/proj-1/assets/${assetId}/file`,
      mimeType: "image/png",
      sizeBytes: 12,
    }),
    delete: async (storageKey: string) => {
      deletedKeys.push(storageKey);
    },
  };
  const service = new ImageGenerationService(
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
  };
}

describe("ImageGenerationService", () => {
  it("resolves IMAGE capability and records usage without creating assets on preview", async () => {
    const { service, createdTasks, createdAssets, generateCalls, taskState } =
      createService();
    const task = await service.createImageGeneration("proj-1", { shotId: "shot-1" });
    expect(createdTasks[0]?.type).toBe("IMAGE");
    expect(createdTasks[0]?.capability).toBe("IMAGE");
    expect(generateCalls).toHaveLength(1);
    expect(task.status).toBe("SUCCEEDED");
    expect(createdAssets).toHaveLength(0);
    expect(JSON.stringify(task)).not.toContain("sk-secret-key");
    expect(taskState.usage.imageCount).toBe(1);
  });

  it("maps missing IMAGE provider without calling AI", async () => {
    const { service, createdTasks, generateCalls } = createService({
      resolveError: new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
        "尚未配置图片生成 AI。",
      ),
    });
    await expect(
      service.createImageGeneration("proj-1", { shotId: "shot-1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.IMAGE_PROVIDER_NOT_CONFIGURED });
    expect(createdTasks).toHaveLength(0);
    expect(generateCalls).toHaveLength(0);
  });

  it("maps provider capability errors without calling AI", async () => {
    const { service, generateCalls } = createService({
      resolveError: new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.PROVIDER_CAPABILITY_NOT_SUPPORTED,
        "no",
      ),
    });
    await expect(
      service.createImageGeneration("proj-1", { shotId: "shot-1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.IMAGE_CAPABILITY_NOT_SUPPORTED });
    expect(generateCalls).toHaveLength(0);
  });

  it("maps model capability errors without calling AI", async () => {
    const { service, generateCalls } = createService({
      resolveError: new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.MODEL_CAPABILITY_NOT_SUPPORTED,
        "no",
      ),
    });
    await expect(
      service.createImageGeneration("proj-1", { shotId: "shot-1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.IMAGE_MODEL_NOT_SUPPORTED });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects a shot from another project", async () => {
    const { service, generateCalls } = createService({ shotProjectId: "other" });
    await expect(
      service.createImageGeneration("proj-1", { shotId: "shot-1" }),
    ).rejects.toMatchObject({ code: ErrorCodes.PROJECT_EPISODE_MISMATCH });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects a missing shot", async () => {
    const { service } = createService({ missingShot: true });
    await expect(
      service.createImageGeneration("proj-1", { shotId: "missing" }),
    ).rejects.toMatchObject({ code: ErrorCodes.STORYBOARD_SHOT_NOT_FOUND });
  });

  it("rejects a cross-project reference asset", async () => {
    const { service, generateCalls } = createService({
      assets: [{ id: "ref-1", projectId: "other" }],
    });
    await expect(
      service.createImageGeneration("proj-1", {
        shotId: "shot-1",
        referenceAssetIds: ["ref-1"],
      }),
    ).rejects.toMatchObject({
      code: ErrorCodes.IMAGE_REFERENCE_ASSET_PROJECT_MISMATCH,
    });
    expect(generateCalls).toHaveLength(0);
  });

  it("rejects a missing reference asset", async () => {
    const { service } = createService({ assets: [] });
    await expect(
      service.createImageGeneration("proj-1", {
        shotId: "shot-1",
        referenceAssetIds: ["missing-ref"],
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.IMAGE_REFERENCE_ASSET_NOT_FOUND });
  });

  it("does not create assets when generation fails", async () => {
    const { service, createdAssets, taskState } = createService({
      generate: async () => {
        throw new AiProviderError("boom sk-secret-key", "UNAVAILABLE");
      },
    });
    const task = await service.createImageGeneration("proj-1", { shotId: "shot-1" });
    expect(task.status).toBe("FAILED");
    expect(createdAssets).toHaveLength(0);
    expect(String(taskState.error)).not.toContain("sk-secret-key");
  });

  it("apply creates Asset and StoryboardShotAsset as final", async () => {
    const ctx = createService();
    await ctx.service.createImageGeneration("proj-1", { shotId: "shot-1" });
    const applied = await ctx.service.apply("proj-1", "task-1");
    expect(ctx.createdAssets).toHaveLength(1);
    expect(ctx.createdAssets[0]?.type).toBe("IMAGE");
    expect(ctx.createdLinks[0]?.isPrimary).toBe(true);
    expect(ctx.createdLinks[0]?.role).toBe("FINAL");
    expect(applied.appliedAt).toBeInstanceOf(Date);
  });

  it("keeps the old final relation when applying a new image", async () => {
    const ctx = createService();
    ctx.createdLinks.push({
      shotId: "shot-1",
      assetId: "old-asset",
      role: "FINAL",
      isPrimary: true,
    });
    await ctx.service.createImageGeneration("proj-1", { shotId: "shot-1" });
    await ctx.service.apply("proj-1", "task-1");
    expect(ctx.createdLinks[0]?.assetId).toBe("old-asset");
    expect(ctx.createdLinks[0]?.isPrimary).toBe(false);
    expect(ctx.createdLinks[1]?.isPrimary).toBe(true);
  });

  it("rejects a second apply", async () => {
    const ctx = createService();
    await ctx.service.createImageGeneration("proj-1", { shotId: "shot-1" });
    await ctx.service.apply("proj-1", "task-1");
    await expect(ctx.service.apply("proj-1", "task-1")).rejects.toMatchObject({
      code: ErrorCodes.GENERATION_ALREADY_APPLIED,
    });
  });

  it("rolls back files when the apply transaction fails", async () => {
    const ctx = createService({ transactionError: new Error("db down") });
    await ctx.service.createImageGeneration("proj-1", { shotId: "shot-1" });
    await expect(ctx.service.apply("proj-1", "task-1")).rejects.toMatchObject({
      code: ErrorCodes.IMAGE_ASSET_SAVE_FAILED,
    });
    expect(ctx.deletedKeys.length).toBeGreaterThan(0);
    expect(ctx.taskState.appliedAt).toBeNull();
  });

  it("creates a new task on regenerate", async () => {
    const { service, createdTasks } = createService();
    await service.createImageGeneration("proj-1", { shotId: "shot-1" });
    await service.createImageGeneration("proj-1", { shotId: "shot-1" });
    expect(createdTasks).toHaveLength(2);
  });

  it("rejects invalid counts", async () => {
    const { service, generateCalls } = createService();
    await expect(
      service.createImageGeneration("proj-1", { shotId: "shot-1", count: 100 }),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_IMAGE_COUNT });
    await expect(
      service.createImageGeneration("proj-1", { shotId: "shot-1", count: 0 }),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_IMAGE_COUNT });
    expect(generateCalls).toHaveLength(0);
  });

  it("rethrows provider disabled / missing key / model disabled without calling AI", async () => {
    for (const code of [
      ErrorCodes.PROVIDER_DISABLED,
      ErrorCodes.PROVIDER_API_KEY_MISSING,
      ErrorCodes.MODEL_DISABLED,
    ] as const) {
      const { service, generateCalls } = createService({
        resolveError: new AppError(HttpStatus.BAD_REQUEST, code, "blocked"),
      });
      await expect(
        service.createImageGeneration("proj-1", { shotId: "shot-1" }),
      ).rejects.toMatchObject({ code });
      expect(generateCalls).toHaveLength(0);
    }
  });
});
