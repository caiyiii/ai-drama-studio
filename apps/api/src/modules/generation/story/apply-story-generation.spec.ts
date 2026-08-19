import { describe, expect, it } from "vitest";
import { ErrorCodes } from "../../../common/app-error";
import {
  applyEpisodeOutlineGeneration,
  applySeasonOutlineGeneration,
  applyStoryBibleGeneration,
} from "./apply-story-generation";
import { validEpisodeOutlineGeneration } from "./episode-outline-generation.schema.spec";
import { validSeasonOutlineGeneration } from "./season-outline-generation.schema.spec";
import { validStoryBibleGeneration } from "./story-bible-generation.schema.spec";

function createFakeDb(failOn?: string) {
  const store = {
    storyBible: null as { id: string; projectId: string; title: string } | null,
    season: { id: "season-1", projectId: "proj-1" } as { id: string; projectId: string } | null,
    episodes: [] as Array<Record<string, unknown>>,
    appliedAt: null as Date | null,
  };

  const tx = {
    storyBible: {
      findUnique: async () => store.storyBible,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.storyBible = { id: "bible-1", projectId: "proj-1", title: String(data.title) };
        return store.storyBible;
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        if (store.storyBible) {
          store.storyBible.title = String(data.title);
        }
        return store.storyBible;
      },
    },
    season: {
      findFirst: async () => store.season,
    },
    episode: {
      findMany: async () => store.episodes.map((item) => ({ number: Number(item.number) })),
      findFirst: async ({ where: { id } }: { where: { id: string } }) =>
        store.episodes.find((item) => item.id === id) ?? { id: "ep-1", projectId: "proj-1" },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (failOn === "episode" && store.episodes.length >= 1) {
          throw new Error("episode write failed");
        }
        const created = { id: `ep-${store.episodes.length + 1}`, ...data };
        store.episodes.push(created);
        return created;
      },
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.episodes.find((item) => item.id === id) ?? {
          id,
          projectId: "proj-1",
        };
        Object.assign(row, data);
        if (!store.episodes.includes(row)) {
          store.episodes.push(row);
        }
        return row;
      },
    },
    generationTask: {
      update: async ({ data }: { data: { appliedAt: Date } }) => {
        store.appliedAt = data.appliedAt;
        return data;
      },
    },
  };

  async function transaction<T>(fn: (client: typeof tx) => Promise<T>): Promise<T> {
    const snapshot = structuredClone(store);
    try {
      return await fn(tx);
    } catch (error) {
      store.storyBible = snapshot.storyBible;
      store.season = snapshot.season;
      store.episodes = snapshot.episodes;
      store.appliedAt = snapshot.appliedAt;
      throw error;
    }
  }

  return { store, tx, transaction };
}

describe("Apply story generation transaction", () => {
  it("creates a story bible and marks appliedAt", async () => {
    const db = createFakeDb();
    await db.transaction((client) =>
      applyStoryBibleGeneration(client as never, "proj-1", "task-1", validStoryBibleGeneration),
    );
    expect(db.store.storyBible?.title).toBe("星河碰撞");
    expect(db.store.appliedAt).toBeInstanceOf(Date);
  });

  it("creates episodes from season outline without updating season", async () => {
    const db = createFakeDb();
    await db.transaction((client) =>
      applySeasonOutlineGeneration(
        client as never,
        "proj-1",
        "season-1",
        "task-1",
        { ...validSeasonOutlineGeneration, existingEpisodes: [] },
        300,
        "INITIAL",
      ),
    );
    expect(db.store.episodes).toHaveLength(3);
    expect(db.store.episodes[0]?.title).toBe("星系碰撞");
    expect(db.store.episodes[0]?.storyState).toBeDefined();
    expect(db.store.season?.id).toBe("season-1");
  });

  it("rolls back episode creates when a later write fails", async () => {
    const db = createFakeDb("episode");
    await expect(
      db.transaction((client) =>
        applySeasonOutlineGeneration(
          client as never,
          "proj-1",
          "season-1",
          "task-1",
          { ...validSeasonOutlineGeneration, existingEpisodes: [] },
          300,
          "INITIAL",
        ),
      ),
    ).rejects.toThrow("episode write failed");
    expect(db.store.episodes).toHaveLength(0);
    expect(db.store.appliedAt).toBeNull();
  });

  it("rejects apply when episode numbers already exist", async () => {
    const db = createFakeDb();
    db.store.episodes.push({ id: "ep-old", number: 1 });
    await expect(
      db.transaction((client) =>
        applySeasonOutlineGeneration(
          client as never,
          "proj-1",
          "season-1",
          "task-1",
          validSeasonOutlineGeneration,
          300,
          "INITIAL",
        ),
      ),
    ).rejects.toMatchObject({ code: ErrorCodes.EPISODE_NUMBER_CONFLICT });
    expect(db.store.episodes).toHaveLength(1);
  });

  it("creates only new episodes in CONTINUE mode", async () => {
    const db = createFakeDb();
    db.store.episodes.push({ id: "ep-old-1", number: 1, title: "E01" });
    db.store.episodes.push({ id: "ep-old-2", number: 2, title: "E02" });
    await db.transaction((client) =>
      applySeasonOutlineGeneration(
        client as never,
        "proj-1",
        "season-1",
        "task-1",
        {
          ...validSeasonOutlineGeneration,
          existingEpisodes: [
            { number: 1, title: "E01", synopsis: "旧 1" },
            { number: 2, title: "E02", synopsis: "旧 2" },
          ],
          newEpisodes: validSeasonOutlineGeneration.newEpisodes.map((item, index) => ({
            ...item,
            number: index + 3,
          })),
        },
        300,
        "CONTINUE",
      ),
    );
    expect(db.store.episodes).toHaveLength(5);
    expect(db.store.episodes[0]?.title).toBe("E01");
    expect(db.store.episodes[1]?.title).toBe("E02");
    expect(db.store.episodes[2]?.number).toBe(3);
  });

  it("requires explicit confirmation for REPLAN", async () => {
    const db = createFakeDb();
    await expect(
      db.transaction((client) =>
        applySeasonOutlineGeneration(
          client as never,
          "proj-1",
          "season-1",
          "task-1",
          { ...validSeasonOutlineGeneration, existingEpisodes: [] },
          300,
          "REPLAN",
          false,
        ),
      ),
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_REQUEST });
  });

  it("updates an existing episode outline", async () => {
    const db = createFakeDb();
    db.store.episodes.push({ id: "ep-1", projectId: "proj-1", title: "草稿" });
    await db.transaction((client) =>
      applyEpisodeOutlineGeneration(
        client as never,
        "proj-1",
        "ep-1",
        "task-1",
        validEpisodeOutlineGeneration,
      ),
    );
    expect(db.store.episodes[0]?.title).toBe("星系碰撞");
    expect(db.store.episodes[0]?.status).toBe("OUTLINED");
  });
});
