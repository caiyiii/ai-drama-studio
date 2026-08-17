import { describe, expect, it } from "vitest";
import type { WorldGenerationResult } from "@ai-drama-studio/types";
import {
  applyWorldGenerationResult,
  type WorldApplyClient,
} from "./apply-world-generation";

const result: WorldGenerationResult = {
  world: {
    name: "星河碰撞",
    description: "简介",
    cosmicBackground: "背景",
    coreConflict: "冲突",
  },
  civilizations: [
    {
      name: "修仙文明",
      type: "修仙",
      description: "d",
      philosophy: "p",
      society: "s",
      culture: "c",
      technology: "t",
    },
  ],
  histories: [{ title: "碰撞", description: "d", order: 0 }],
  factions: [{ name: "问天宗", description: "d", civilizationName: "修仙文明" }],
  locations: [{ name: "折剑星", description: "d", civilizationName: "修仙文明" }],
  powerSystems: [
    { name: "修仙体系", description: "d", rules: ["r"], levels: [{ name: "炼气" }] },
  ],
};

function createFakeDb(failOn?: string) {
  const store = {
    world: null as { id: string; projectId: string; title: string } | null,
    civilizations: [] as Array<{ id: string; name: string }>,
    histories: [] as unknown[],
    factions: [] as unknown[],
    locations: [] as unknown[],
    powerSystems: [] as unknown[],
  };

  const tx: WorldApplyClient = {
    world: {
      findUnique: async () => (store.world ? { id: store.world.id } : null),
      create: async ({ data }) => {
        store.world = { id: "world-1", projectId: data.projectId, title: data.title };
        return { id: "world-1" };
      },
      update: async ({ data }) => {
        if (!store.world) {
          throw new Error("missing world");
        }
        store.world.title = data.title;
        return { id: store.world.id };
      },
    },
    civilization: {
      deleteMany: async () => {
        store.civilizations = [];
      },
      create: async ({ data }) => {
        if (failOn === "civilization") {
          throw new Error("civilization write failed");
        }
        const created = { id: `civ-${store.civilizations.length + 1}`, name: data.name };
        store.civilizations.push(created);
        return created;
      },
    },
    worldHistory: {
      deleteMany: async () => {
        store.histories = [];
      },
      create: async ({ data }) => {
        store.histories.push(data);
      },
    },
    faction: {
      deleteMany: async () => {
        store.factions = [];
      },
      create: async ({ data }) => {
        store.factions.push(data);
      },
    },
    worldLocation: {
      deleteMany: async () => {
        store.locations = [];
      },
      create: async ({ data }) => {
        store.locations.push(data);
      },
    },
    powerSystem: {
      deleteMany: async () => {
        store.powerSystems = [];
      },
      create: async ({ data }) => {
        store.powerSystems.push(data);
      },
    },
  };

  async function transaction<T>(fn: (client: WorldApplyClient) => Promise<T>): Promise<T> {
    const snapshot = structuredClone(store);
    try {
      return await fn(tx);
    } catch (error) {
      store.world = snapshot.world;
      store.civilizations = snapshot.civilizations;
      store.histories = snapshot.histories;
      store.factions = snapshot.factions;
      store.locations = snapshot.locations;
      store.powerSystems = snapshot.powerSystems;
      throw error;
    }
  }

  return { store, tx, transaction };
}

describe("Apply world generation transaction", () => {
  it("uses a transaction to write world entities", async () => {
    const db = createFakeDb();
    const applied = await db.transaction((tx) =>
      applyWorldGenerationResult(tx, "project-1", result),
    );
    expect(applied.worldId).toBe("world-1");
    expect(db.store.world?.title).toBe("星河碰撞");
    expect(db.store.civilizations).toHaveLength(1);
    expect(db.store.histories).toHaveLength(1);
    expect(db.store.factions).toHaveLength(1);
    expect(db.store.locations).toHaveLength(1);
    expect(db.store.powerSystems).toHaveLength(1);
  });

  it("rolls back when a later write fails", async () => {
    const db = createFakeDb("civilization");
    await expect(
      db.transaction((tx) => applyWorldGenerationResult(tx, "project-1", result)),
    ).rejects.toThrow(/civilization write failed/);
    expect(db.store.world).toBeNull();
    expect(db.store.civilizations).toHaveLength(0);
    expect(db.store.histories).toHaveLength(0);
  });
});
