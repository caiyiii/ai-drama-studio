import { describe, expect, it } from "vitest";
import { ErrorCodes } from "../../../common/app-error";
import {
  applyCharacterGenerationResult,
  type CharacterApplyClient,
} from "./apply-character-generation";
import { validCharacterGeneration } from "./character-generation.schema.spec";

function createFakeDb(failOn?: string) {
  const store = {
    world: { id: "world-1", projectId: "project-1" } as { id: string; projectId: string } | null,
    civilizations: [{ id: "civ-1", name: "修仙文明" }],
    factions: [{ id: "fac-1", name: "问天宗", civilizationId: "civ-1" }],
    characters: [{ id: "char-master", name: "太虚真人" }],
    relationships: [] as unknown[],
    appliedAt: null as Date | null,
  };

  const tx: CharacterApplyClient = {
    world: {
      findUnique: async () => (store.world ? { id: store.world.id } : null),
    },
    civilization: {
      findMany: async () => store.civilizations,
    },
    faction: {
      findMany: async () => store.factions,
    },
    character: {
      findMany: async () => store.characters,
      create: async ({ data }) => {
        if (failOn === "character") {
          throw new Error("character write failed");
        }
        const created = { id: "char-new", name: String(data.name) };
        store.characters.push(created);
        return created;
      },
    },
    characterRelationship: {
      create: async ({ data }) => {
        if (failOn === "relationship") {
          throw new Error("relationship write failed");
        }
        store.relationships.push(data);
        return data;
      },
    },
    generationTask: {
      update: async ({ data }) => {
        store.appliedAt = data.appliedAt;
        return data;
      },
    },
  };

  async function transaction<T>(
    fn: (client: CharacterApplyClient) => Promise<T>,
  ): Promise<T> {
    const snapshot = structuredClone(store);
    try {
      return await fn(tx);
    } catch (error) {
      store.world = snapshot.world;
      store.civilizations = snapshot.civilizations;
      store.factions = snapshot.factions;
      store.characters = snapshot.characters;
      store.relationships = snapshot.relationships;
      store.appliedAt = snapshot.appliedAt;
      throw error;
    }
  }

  return { store, tx, transaction };
}

describe("Apply character generation transaction", () => {
  it("creates a character and relationships in one transaction", async () => {
    const db = createFakeDb();
    const created = await db.transaction((client) =>
      applyCharacterGenerationResult(
        client,
        "project-1",
        "task-1",
        validCharacterGeneration,
      ),
    );
    expect(created.id).toBe("char-new");
    expect(db.store.characters.map((item) => item.name)).toContain("沈星河");
    expect(db.store.relationships).toHaveLength(1);
    expect(db.store.appliedAt).toBeInstanceOf(Date);
  });

  it("rolls back when relationship write fails", async () => {
    const db = createFakeDb("relationship");
    await expect(
      db.transaction((client) =>
        applyCharacterGenerationResult(
          client,
          "project-1",
          "task-1",
          validCharacterGeneration,
        ),
      ),
    ).rejects.toThrow(/relationship write failed/);
    expect(db.store.characters.map((item) => item.name)).toEqual(["太虚真人"]);
    expect(db.store.relationships).toHaveLength(0);
    expect(db.store.appliedAt).toBeNull();
  });

  it("rejects duplicate character names", async () => {
    const db = createFakeDb();
    db.store.characters.push({ id: "char-dup", name: "沈星河" });
    await expect(
      applyCharacterGenerationResult(
        db.tx,
        "project-1",
        "task-1",
        validCharacterGeneration,
      ),
    ).rejects.toMatchObject({
      code: ErrorCodes.CHARACTER_NAME_CONFLICT,
    });
    expect(db.store.appliedAt).toBeNull();
  });
});
