import { describe, expect, it } from "vitest";
import { ErrorCodes } from "../../../common/app-error";
import { applyScriptGeneration } from "./apply-script-generation";
import { validScriptGeneration } from "./script-generation.schema.spec";

function createFakeDb(failOn?: string) {
  const store = {
    episode: {
      id: "ep-1",
      projectId: "proj-1",
      status: "OUTLINED",
      durationSeconds: 300,
    } as Record<string, unknown> | null,
    characters: [
      { id: "c-shen", name: "沈星河", alias: null, projectId: "proj-1" },
      { id: "c-taixu", name: "太虚真人", alias: null, projectId: "proj-1" },
      { id: "c-other", name: "外人", alias: null, projectId: "proj-b" },
    ],
    scripts: [] as Array<Record<string, unknown>>,
    scenes: [] as Array<Record<string, unknown>>,
    blocks: [] as Array<Record<string, unknown>>,
    appliedAt: null as Date | null,
    task: {
      id: "task-1",
      projectId: "proj-1",
      type: "SCRIPT",
      status: "SUCCEEDED",
    },
  };

  const tx = {
    generationTask: {
      findFirst: async ({
        where: { id, projectId },
      }: {
        where: { id: string; projectId: string };
      }) =>
        store.task.id === id && store.task.projectId === projectId ? store.task : null,
      update: async ({ data }: { data: { appliedAt: Date } }) => {
        store.appliedAt = data.appliedAt;
        return data;
      },
    },
    episode: {
      findFirst: async ({
        where: { id, projectId },
      }: {
        where: { id: string; projectId: string };
      }) =>
        store.episode && store.episode.id === id && store.episode.projectId === projectId
          ? store.episode
          : null,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        if (store.episode) {
          Object.assign(store.episode, data);
        }
        return store.episode;
      },
    },
    character: {
      findMany: async ({ where: { projectId } }: { where: { projectId: string } }) =>
        store.characters.filter((item) => item.projectId === projectId),
    },
    script: {
      findUnique: async ({ where: { episodeId } }: { where: { episodeId: string } }) =>
        store.scripts.find((item) => item.episodeId === episodeId) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const created = { id: "script-1", version: 1, ...data };
        store.scripts.push(created);
        return created;
      },
      update: async ({
        where,
        data,
      }: {
        where: { episodeId?: string; id?: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.scripts.find(
          (item) => item.episodeId === where.episodeId || item.id === where.id,
        );
        if (!row) {
          throw new Error("script missing");
        }
        Object.assign(row, data);
        return row;
      },
    },
    scene: {
      deleteMany: async ({ where: { scriptId } }: { where: { scriptId: string } }) => {
        const sceneIds = store.scenes
          .filter((item) => item.scriptId === scriptId)
          .map((item) => item.id);
        store.scenes = store.scenes.filter((item) => item.scriptId !== scriptId);
        store.blocks = store.blocks.filter(
          (item) => !sceneIds.includes(String(item.sceneId)),
        );
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (failOn === "scene") {
          throw new Error("scene write failed");
        }
        const created = { id: `scene-${store.scenes.length + 1}`, ...data };
        store.scenes.push(created);
        return created;
      },
    },
    scriptBlock: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (failOn === "block") {
          throw new Error("block write failed");
        }
        const created = { id: `block-${store.blocks.length + 1}`, ...data };
        store.blocks.push(created);
        return created;
      },
    },
  };

  async function transaction<T>(fn: (client: typeof tx) => Promise<T>): Promise<T> {
    const snapshot = structuredClone(store);
    try {
      return await fn(tx);
    } catch (error) {
      store.episode = snapshot.episode;
      store.characters = snapshot.characters;
      store.scripts = snapshot.scripts;
      store.scenes = snapshot.scenes;
      store.blocks = snapshot.blocks;
      store.appliedAt = snapshot.appliedAt;
      store.task = snapshot.task;
      throw error;
    }
  }

  return { store, tx, transaction };
}

describe("Apply script generation transaction", () => {
  it("creates Script, Scene, ScriptBlock and sets appliedAt", async () => {
    const db = createFakeDb();
    await db.transaction((client) =>
      applyScriptGeneration(
        client as never,
        "proj-1",
        "ep-1",
        "task-1",
        validScriptGeneration,
      ),
    );
    expect(db.store.scripts).toHaveLength(1);
    expect(db.store.scenes).toHaveLength(1);
    expect(db.store.blocks).toHaveLength(4);
    expect(db.store.blocks[1]?.characterId).toBe("c-shen");
    expect(db.store.episode?.status).toBe("SCRIPTING");
    expect(db.store.appliedAt).toBeInstanceOf(Date);
  });

  it("replaces an existing script and increments version", async () => {
    const db = createFakeDb();
    db.store.scripts.push({
      id: "script-1",
      episodeId: "ep-1",
      projectId: "proj-1",
      version: 1,
      title: "旧稿",
    });
    db.store.scenes.push({ id: "old-scene", scriptId: "script-1", number: 1 });
    db.store.blocks.push({ id: "old-block", sceneId: "old-scene", order: 1 });
    await db.transaction((client) =>
      applyScriptGeneration(
        client as never,
        "proj-1",
        "ep-1",
        "task-1",
        validScriptGeneration,
      ),
    );
    expect(db.store.scripts).toHaveLength(1);
    expect(db.store.scripts[0]?.version).toBe(2);
    expect(db.store.scripts[0]?.title).toBe("星系碰撞");
    expect(db.store.scenes).toHaveLength(1);
    expect(db.store.blocks.some((item) => item.id === "old-block")).toBe(false);
  });

  it("marks unresolved dialogue characters without creating people", async () => {
    const db = createFakeDb();
    const result = {
      ...validScriptGeneration,
      scenes: [
        {
          ...validScriptGeneration.scenes[0],
          blocks: [
            {
              order: 1,
              type: "DIALOGUE" as const,
              characterName: "不存在的人",
              content: "你好",
              metadata: {},
            },
          ],
        },
      ],
    };
    await db.transaction((client) =>
      applyScriptGeneration(client as never, "proj-1", "ep-1", "task-1", result),
    );
    expect(db.store.characters).toHaveLength(3);
    expect(db.store.blocks[0]?.characterId).toBeNull();
    expect((db.store.blocks[0]?.metadata as { unresolvedCharacter?: boolean }).unresolvedCharacter).toBe(
      true,
    );
  });

  it("rejects cross-project episode mismatch", async () => {
    const db = createFakeDb();
    await expect(
      db.transaction((client) =>
        applyScriptGeneration(
          client as never,
          "proj-b",
          "ep-1",
          "task-1",
          validScriptGeneration,
        ),
      ),
    ).rejects.toMatchObject({ code: ErrorCodes.PROJECT_EPISODE_MISMATCH });
    expect(db.store.scripts).toHaveLength(0);
  });

  it("rolls back when a later write fails", async () => {
    const db = createFakeDb("block");
    await expect(
      db.transaction((client) =>
        applyScriptGeneration(
          client as never,
          "proj-1",
          "ep-1",
          "task-1",
          validScriptGeneration,
        ),
      ),
    ).rejects.toThrow("block write failed");
    expect(db.store.scripts).toHaveLength(0);
    expect(db.store.scenes).toHaveLength(0);
    expect(db.store.blocks).toHaveLength(0);
    expect(db.store.appliedAt).toBeNull();
  });
});
