import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AppError, ErrorCodes } from "../../common/app-error";
import { AiProviderError } from "../ai/ai.errors";
import { StoryGenerationService } from "./story-generation.service";
import { validEpisodeOutlineGeneration } from "./story/episode-outline-generation.schema.spec";
import { validSeasonOutlineGeneration } from "./story/season-outline-generation.schema.spec";
import { validStoryBibleGeneration } from "./story/story-bible-generation.schema.spec";

function emptyContext(
  episodes: Array<{ id: string; number: number; title: string; synopsis?: string }> = [],
) {
  return {
    storyBible: null,
    world: { title: "星河碰撞", summary: "碰撞", cosmicBackground: "", coreConflict: "修仙与赛博" },
    civilizations: [],
    factions: [],
    locations: [],
    powerSystems: [],
    characters: [{ id: "c1", name: "沈星河", role: "主角", identity: null, personality: null, goal: null, conflict: null }],
    relationships: [],
    seasons: [],
    episodes,
    season: { id: "season-1", number: 1, title: "星河初遇", synopsis: "", outline: "", status: "DRAFT" },
    episode: { id: "ep-1", number: 1, title: "草稿", synopsis: "", outline: "", status: "DRAFT", storyState: null },
    previousEpisode: null,
  };
}

function createService(options?: {
  generate?: () => Promise<unknown>;
  type?: "STORY_BIBLE" | "SEASON_OUTLINE" | "EPISODE_OUTLINE";
  contextEpisodes?: Array<{ id: string; number: number; title: string; synopsis?: string }>;
}) {
  const createdTasks: Array<Record<string, unknown>> = [];
  const createdEpisodes: Array<Record<string, unknown>> = [];
  const createdBibles: Array<Record<string, unknown>> = [];
  const taskState = { appliedAt: null as Date | null };
  const prisma = {
    project: { findUnique: async () => ({ id: "proj-1" }) },
    season: {
      findFirst: async () => ({ id: "season-1", projectId: "proj-1" }),
    },
    episode: {
      findFirst: async () => ({ id: "ep-1", projectId: "proj-1", seasonId: "season-1" }),
      findMany: async () => createdEpisodes.map((item) => ({ number: item.number })),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdEpisodes.push(data);
        return { id: `ep-${createdEpisodes.length}`, ...data };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => data,
    },
    storyBible: {
      findUnique: async () => createdBibles[0] ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdBibles.push(data);
        return { id: "bible-1", ...data };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => data,
    },
    generationTask: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdTasks.push(data);
        return { id: "task-1", ...data };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        if (data.appliedAt) {
          taskState.appliedAt = data.appliedAt as Date;
        }
        return { id: "task-1" };
      },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  const resolved = {
    source: "project",
    id: "prov-1",
    name: "我的 DeepSeek",
    kind: "OPENAI_COMPATIBLE",
    model: "deepseek-chat",
    apiKey: "sk-secret-key",
  };
  const ai = {
    resolveForCapability: async (_projectId: string, capability: string) => {
      expect(capability).toBe("STRUCTURED_OUTPUT");
      return resolved;
    },
    generateWith: async () => {
      if (options?.generate) {
        return options.generate();
      }
      if (options?.type === "SEASON_OUTLINE") {
        return validSeasonOutlineGeneration;
      }
      if (options?.type === "EPISODE_OUTLINE") {
        return validEpisodeOutlineGeneration;
      }
      return validStoryBibleGeneration;
    },
  };
  const taskByStatus: {
    id: string;
    projectId: string;
    type: string;
    status: string;
    output: unknown;
    error: string | null;
    appliedAt: Date | null;
    provider: string;
    model: string;
    capability: string;
    usage: { durationMs: number };
  } = {
    id: "task-1",
    projectId: "proj-1",
    type: options?.type ?? "STORY_BIBLE",
    status: "SUCCEEDED",
    output:
      options?.type === "SEASON_OUTLINE"
        ? { ...validSeasonOutlineGeneration, existingEpisodes: [] }
        : options?.type === "EPISODE_OUTLINE"
          ? validEpisodeOutlineGeneration
          : validStoryBibleGeneration,
    error: null,
    appliedAt: null,
    provider: "我的 DeepSeek",
    model: "deepseek-chat",
    capability: "STRUCTURED_OUTPUT",
    usage: { durationMs: 120 },
  };
  const executor = {
    run: async (_id: string, work: () => Promise<unknown>, secret?: string) => {
      try {
        const output = await work();
        taskByStatus.output = output;
        taskByStatus.status = "SUCCEEDED";
        return output;
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI 生成失败";
        taskByStatus.status = "FAILED";
        taskByStatus.output = null;
        taskByStatus.error =
          secret && message.includes(secret)
            ? message.split(secret).join("[redacted]")
            : message;
        throw error;
      }
    },
    getTask: async () => ({
      ...createdTasks[0],
      ...taskByStatus,
      appliedAt: taskState.appliedAt ?? taskByStatus.appliedAt,
    }),
  };
  const contextBuilder = {
    buildProjectContext: async () => emptyContext(options?.contextEpisodes ?? []),
    buildSeasonContext: async () => emptyContext(options?.contextEpisodes ?? []),
    buildEpisodeContext: async () => emptyContext(options?.contextEpisodes ?? []),
  };
  const service = new StoryGenerationService(
    prisma as never,
    ai as never,
    executor as never,
    contextBuilder as never,
  );
  return { service, createdTasks, createdEpisodes, createdBibles, taskByStatus };
}

describe("Story generation uses ProviderResolver", () => {
  it("records STORY_BIBLE + STRUCTURED_OUTPUT and does not write on preview", async () => {
    const { service, createdTasks, createdBibles } = createService();
    const task = await service.createStoryBibleGeneration("proj-1", {
      instruction: "完善星河碰撞的故事圣经",
    });
    expect(createdTasks[0]?.type).toBe("STORY_BIBLE");
    expect(createdTasks[0]?.capability).toBe("STRUCTURED_OUTPUT");
    expect(createdTasks[0]?.provider).toBe("我的 DeepSeek");
    expect(createdTasks[0]?.model).toBe("deepseek-chat");
    expect(JSON.stringify(createdTasks[0])).not.toContain("sk-secret-key");
    expect(createdBibles).toHaveLength(0);
    expect(task.status).toBe("SUCCEEDED");
    expect(task.usage?.durationMs).toBe(120);
  });

  it("marks FAILED for invalid JSON and schema errors", async () => {
    const invalid = createService({
      generate: async () => {
        throw new AiProviderError("AI 返回非法 JSON", "INVALID_JSON");
      },
    });
    const failedJson = await invalid.service.createStoryBibleGeneration("proj-1", {
      instruction: "生成",
    });
    expect(failedJson.status).toBe("FAILED");
    expect(invalid.createdBibles).toHaveLength(0);

    const schema = createService({
      generate: async () => ({ unexpected: true }),
    });
    const failedSchema = await schema.service.createStoryBibleGeneration("proj-1", {
      instruction: "生成",
    });
    expect(failedSchema.status).toBe("FAILED");
    expect(String(failedSchema.error)).toMatch(/Schema Validation/);
  });

  it("does not leak API keys", async () => {
    const { service } = createService({
      generate: async () => {
        throw new Error("upstream failed with sk-secret-key");
      },
    });
    const task = await service.createStoryBibleGeneration("proj-1", {
      instruction: "生成",
    });
    expect(JSON.stringify(task)).not.toContain("sk-secret-key");
  });

  it("returns NO_AI_PROVIDER_CONFIGURED before creating a task", async () => {
    const prisma = {
      project: { findUnique: async () => ({ id: "proj-1" }) },
      generationTask: { create: async () => ({ id: "should-not" }) },
    };
    const ai = {
      resolveForCapability: async () => {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          ErrorCodes.NO_AI_PROVIDER_CONFIGURED,
          "尚未配置可用的 AI Provider。",
        );
      },
    };
    const service = new StoryGenerationService(
      prisma as never,
      ai as never,
      { run: async () => undefined, getTask: async () => null } as never,
      { buildProjectContext: async () => emptyContext() } as never,
    );
    await expect(
      service.createStoryBibleGeneration("proj-1", { instruction: "test" }),
    ).rejects.toMatchObject({ code: ErrorCodes.NO_AI_PROVIDER_CONFIGURED });
  });

  it("preview does not create episodes, apply does", async () => {
    const { service, createdEpisodes } = createService({ type: "SEASON_OUTLINE" });
    await service.createSeasonOutlineGeneration("proj-1", {
      seasonId: "season-1",
      episodeCount: 3,
      targetDurationSeconds: 300,
    });
    expect(createdEpisodes).toHaveLength(0);
    const applied = await service.apply("proj-1", "task-1");
    expect(createdEpisodes).toHaveLength(3);
    expect(applied.appliedAt).toBeTruthy();
  });

  it("defaults season planning mode to CONTINUE when the season already has episodes", async () => {
    const { service, createdTasks } = createService({
      type: "SEASON_OUTLINE",
      contextEpisodes: [{ id: "ep-1", number: 1, title: "E01", synopsis: "已有" }],
    });
    await service.createSeasonOutlineGeneration("proj-1", {
      seasonId: "season-1",
      episodeCount: 2,
      targetDurationSeconds: 300,
    });
    expect(createdTasks[0]?.input).toMatchObject({ mode: "CONTINUE" });
  });

  it("applies episode outline onto an existing draft", async () => {
    const { service } = createService({ type: "EPISODE_OUTLINE" });
    await service.createEpisodeOutlineGeneration("proj-1", { episodeId: "ep-1" });
    const applied = await service.apply("proj-1", "task-1");
    expect(applied.status).toBe("SUCCEEDED");
  });
});
