import { describe, expect, it } from "vitest";
import { ErrorCodes } from "../../../common/app-error";
import { applyStoryboardGeneration } from "./apply-storyboard-generation";
import { validStoryboardGeneration } from "./storyboard-generation.schema.spec";

function createFakeDb(failOn?: string) {
  const store = {
    episode: {
      id: "ep-1",
      projectId: "proj-1",
      status: "SCRIPTING",
    } as Record<string, unknown> | null,
    characters: [
      { id: "c1", name: "沈星河", projectId: "proj-1" },
      { id: "c-other", name: "外人", projectId: "proj-b" },
    ],
    script: {
      id: "script-1",
      episodeId: "ep-1",
      projectId: "proj-1",
      version: 1,
      scenes: [
        {
          id: "scene-1",
          number: 1,
          scriptId: "script-1",
          blocks: [
            { id: "block-1", sceneId: "scene-1", order: 1 },
            { id: "block-2", sceneId: "scene-1", order: 2 },
          ],
        },
      ],
    } as Record<string, unknown> | null,
    storyboards: [] as Array<Record<string, unknown>>,
    shots: [] as Array<Record<string, unknown>>,
    appliedAt: null as Date | null,
    task: {
      id: "task-1",
      projectId: "proj-1",
      type: "STORYBOARD",
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
    },
    character: {
      findMany: async ({ where: { projectId } }: { where: { projectId: string } }) =>
        store.characters.filter((item) => item.projectId === projectId),
    },
    script: {
      findUnique: async ({ where: { episodeId } }: { where: { episodeId: string } }) =>
        store.script && store.script.episodeId === episodeId ? store.script : null,
    },
    storyboard: {
      findUnique: async ({ where: { episodeId } }: { where: { episodeId: string } }) =>
        store.storyboards.find((item) => item.episodeId === episodeId) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (failOn === "storyboard") {
          throw new Error("storyboard write failed");
        }
        const created = { id: "board-1", version: 1, status: "READY", ...data };
        store.storyboards.push(created);
        return created;
      },
      update: async ({
        where: { episodeId },
        data,
      }: {
        where: { episodeId: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.storyboards.find((item) => item.episodeId === episodeId);
        if (!row) {
          throw new Error("missing storyboard");
        }
        Object.assign(row, data);
        return row;
      },
    },
    storyboardShot: {
      deleteMany: async ({ where: { storyboardId } }: { where: { storyboardId: string } }) => {
        store.shots = store.shots.filter((item) => item.storyboardId !== storyboardId);
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (failOn === "shot") {
          throw new Error("shot write failed");
        }
        const created = { id: `shot-${store.shots.length + 1}`, ...data };
        store.shots.push(created);
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
      store.script = snapshot.script;
      store.storyboards = snapshot.storyboards;
      store.shots = snapshot.shots;
      store.appliedAt = snapshot.appliedAt;
      store.task = snapshot.task;
      throw error;
    }
  }

  return { store, tx, transaction };
}

describe("Apply storyboard generation transaction", () => {
  it("creates Storyboard and Shots and sets appliedAt", async () => {
    const db = createFakeDb();
    await db.transaction((client) =>
      applyStoryboardGeneration(
        client as never,
        "proj-1",
        "ep-1",
        "task-1",
        validStoryboardGeneration,
      ),
    );
    expect(db.store.storyboards).toHaveLength(1);
    expect(db.store.shots).toHaveLength(4);
    expect(db.store.shots.filter((item) => item.scriptBlockId === "block-1")).toHaveLength(2);
    expect(db.store.appliedAt).toBeInstanceOf(Date);
    expect(db.store.storyboards[0]?.sourceScriptVersion).toBe(1);
    expect(db.store.storyboards[0]?.version).toBe(1);
    expect(db.store.storyboards[0]?.status).toBe("DRAFT");
  });

  it("increments version when replacing an existing storyboard", async () => {
    const db = createFakeDb();
    db.store.storyboards.push({
      id: "board-1",
      episodeId: "ep-1",
      projectId: "proj-1",
      version: 1,
      status: "READY",
    });
    await db.transaction((client) =>
      applyStoryboardGeneration(
        client as never,
        "proj-1",
        "ep-1",
        "task-1",
        validStoryboardGeneration,
      ),
    );
    expect(db.store.storyboards).toHaveLength(1);
    expect(db.store.storyboards[0]?.version).toBe(2);
    expect(db.store.shots).toHaveLength(4);
  });

  it("rejects unknown character and rolls back", async () => {
    const db = createFakeDb();
    await expect(
      db.transaction((client) =>
        applyStoryboardGeneration(client as never, "proj-1", "ep-1", "task-1", {
          ...validStoryboardGeneration,
          shots: [
            {
              ...validStoryboardGeneration.shots[0],
              characterIds: ["missing-char"],
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: ErrorCodes.STORYBOARD_INVALID_CHARACTER });
    expect(db.store.storyboards).toHaveLength(0);
    expect(db.store.appliedAt).toBeNull();
  });

  it("rejects unknown ScriptBlock and rolls back", async () => {
    const db = createFakeDb();
    await expect(
      db.transaction((client) =>
        applyStoryboardGeneration(client as never, "proj-1", "ep-1", "task-1", {
          ...validStoryboardGeneration,
          shots: [
            {
              ...validStoryboardGeneration.shots[0],
              scriptBlockIds: ["missing-block"],
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: ErrorCodes.STORYBOARD_INVALID_SCRIPT_BLOCK });
    expect(db.store.shots).toHaveLength(0);
  });

  it("rolls back when shot write fails", async () => {
    const db = createFakeDb("shot");
    await expect(
      db.transaction((client) =>
        applyStoryboardGeneration(
          client as never,
          "proj-1",
          "ep-1",
          "task-1",
          validStoryboardGeneration,
        ),
      ),
    ).rejects.toThrow(/shot write failed/);
    expect(db.store.storyboards).toHaveLength(0);
    expect(db.store.shots).toHaveLength(0);
    expect(db.store.appliedAt).toBeNull();
  });
});
