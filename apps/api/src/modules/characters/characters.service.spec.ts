import { describe, expect, it } from "vitest";
import {
  CharacterRelationType,
  CharacterStatus,
} from "@ai-drama-studio/types";
import {
  buildCharacterContext,
  serializeCharacterContext,
} from "@ai-drama-studio/core";
import { AppError, ErrorCodes } from "../../common/app-error";
import { CharactersService } from "./characters.service";

type CharacterRow = {
  id: string;
  projectId: string;
  worldId: string | null;
  civilizationId: string | null;
  factionId: string | null;
  name: string;
  alias: string | null;
  gender: string | null;
  age: number | null;
  race: string | null;
  identity: string | null;
  role: string | null;
  description: string | null;
  personality: string | null;
  appearance: string | null;
  background: string | null;
  motivation: string | null;
  goal: string | null;
  conflict: string | null;
  ability: string | null;
  personalityProfile: unknown;
  appearanceProfile: unknown;
  abilities: unknown;
  voiceProfile: unknown;
  imageProfile: unknown;
  metadata: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type RelationRow = {
  id: string;
  projectId: string;
  fromCharacterId: string;
  toCharacterId: string;
  type: string;
  label: string | null;
  description: string | null;
  strength: number;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function createService() {
  const store = {
    projects: [{ id: "proj-a" }, { id: "proj-b" }],
    worlds: [
      { id: "world-a", projectId: "proj-a" },
      { id: "world-b", projectId: "proj-b" },
    ],
    civilizations: [
      { id: "civ-xian", worldId: "world-a", name: "修仙文明" },
      { id: "civ-cyber", worldId: "world-a", name: "赛博文明" },
      { id: "civ-other", worldId: "world-b", name: "外项目文明" },
    ],
    factions: [
      { id: "fac-tian", worldId: "world-a", name: "天玄宗" },
      { id: "fac-other", worldId: "world-b", name: "外项目势力" },
    ],
    characters: [] as CharacterRow[],
    relationships: [] as RelationRow[],
  };

  function withIncludes(row: CharacterRow) {
    return {
      ...row,
      civilization:
        store.civilizations.find((item) => item.id === row.civilizationId) ??
        null,
      faction: store.factions.find((item) => item.id === row.factionId) ?? null,
    };
  }

  function withRelationIncludes(row: RelationRow) {
    const from = store.characters.find((item) => item.id === row.fromCharacterId);
    const to = store.characters.find((item) => item.id === row.toCharacterId);
    return {
      ...row,
      fromCharacter: from
        ? { id: from.id, name: from.name, alias: from.alias, role: from.role }
        : { id: row.fromCharacterId, name: "?", alias: null, role: null },
      toCharacter: to
        ? { id: to.id, name: to.name, alias: to.alias, role: to.role }
        : { id: row.toCharacterId, name: "?", alias: null, role: null },
    };
  }

  const prisma = {
    project: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.projects.find((item) => item.id === id) ?? null,
    },
    world: {
      findUnique: async ({
        where: { projectId },
      }: {
        where: { projectId: string };
      }) => store.worlds.find((item) => item.projectId === projectId) ?? null,
    },
    civilization: {
      findFirst: async ({
        where: { id, worldId },
      }: {
        where: { id: string; worldId: string };
      }) =>
        store.civilizations.find(
          (item) => item.id === id && item.worldId === worldId,
        ) ?? null,
    },
    faction: {
      findFirst: async ({
        where: { id, worldId },
      }: {
        where: { id: string; worldId: string };
      }) =>
        store.factions.find(
          (item) => item.id === id && item.worldId === worldId,
        ) ?? null,
    },
    character: {
      findMany: async ({
        where,
        skip,
        take,
      }: {
        where: {
          projectId: string;
          name?: { contains?: string; equals?: string; mode?: string };
          role?: string;
          civilizationId?: string;
          factionId?: string;
        };
        skip?: number;
        take?: number;
      }) => {
        let rows = store.characters.filter((item) => item.projectId === where.projectId);
        if (where.name?.contains) {
          const needle = where.name.contains.toLowerCase();
          rows = rows.filter((item) => item.name.toLowerCase().includes(needle));
        }
        if (where.role) {
          rows = rows.filter((item) => item.role === where.role);
        }
        if (where.civilizationId) {
          rows = rows.filter((item) => item.civilizationId === where.civilizationId);
        }
        if (where.factionId) {
          rows = rows.filter((item) => item.factionId === where.factionId);
        }
        const start = skip ?? 0;
        const end = take != null ? start + take : undefined;
        return rows.slice(start, end).map(withIncludes);
      },
      count: async ({
        where,
      }: {
        where: { projectId: string; name?: { contains?: string } };
      }) => {
        return store.characters.filter((item) => {
          if (item.projectId !== where.projectId) {
            return false;
          }
          if (where.name?.contains) {
            return item.name.toLowerCase().includes(where.name.contains.toLowerCase());
          }
          return true;
        }).length;
      },
      findFirst: async ({
        where,
      }: {
        where: {
          projectId: string;
          name?: { equals?: string; mode?: string };
          id?: { not?: string };
        };
      }) => {
        const row = store.characters.find((item) => {
          if (item.projectId !== where.projectId) {
            return false;
          }
          if (where.id?.not && item.id === where.id.not) {
            return false;
          }
          if (where.name?.equals) {
            return item.name.toLowerCase() === where.name.equals.toLowerCase();
          }
          return true;
        });
        return row ? withIncludes(row) : null;
      },
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        const row = store.characters.find((item) => item.id === id);
        return row ? withIncludes(row) : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: CharacterRow = {
          id: `char-${store.characters.length + 1}`,
          projectId: String(data.projectId),
          worldId: (data.worldId as string | null) ?? null,
          civilizationId: (data.civilizationId as string | null) ?? null,
          factionId: (data.factionId as string | null) ?? null,
          name: String(data.name),
          alias: (data.alias as string | null) ?? null,
          gender: (data.gender as string | null) ?? null,
          age: (data.age as number | null) ?? null,
          race: (data.race as string | null) ?? null,
          identity: (data.identity as string | null) ?? null,
          role: (data.role as string | null) ?? null,
          description: (data.description as string | null) ?? null,
          personality: (data.personality as string | null) ?? null,
          appearance: (data.appearance as string | null) ?? null,
          background: (data.background as string | null) ?? null,
          motivation: (data.motivation as string | null) ?? null,
          goal: (data.goal as string | null) ?? null,
          conflict: (data.conflict as string | null) ?? null,
          ability: (data.ability as string | null) ?? null,
          personalityProfile: data.personalityProfile ?? null,
          appearanceProfile: data.appearanceProfile ?? null,
          abilities: data.abilities ?? null,
          voiceProfile: data.voiceProfile ?? null,
          imageProfile: data.imageProfile ?? null,
          metadata: data.metadata ?? null,
          status: String(data.status ?? "ACTIVE"),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.characters.push(row);
        return withIncludes(row);
      },
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.characters.find((item) => item.id === id);
        if (!row) {
          throw new Error("missing");
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return withIncludes(row);
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        store.characters = store.characters.filter((item) => item.id !== id);
        store.relationships = store.relationships.filter(
          (item) => item.fromCharacterId !== id && item.toCharacterId !== id,
        );
      },
    },
    characterRelationship: {
      findMany: async ({
        where: { projectId },
      }: {
        where: { projectId: string };
      }) =>
        store.relationships
          .filter((item) => item.projectId === projectId)
          .map(withRelationIncludes),
      findFirst: async ({
        where: { id, projectId },
      }: {
        where: { id: string; projectId: string };
      }) => {
        const row = store.relationships.find(
          (item) => item.id === id && item.projectId === projectId,
        );
        return row ? withRelationIncludes(row) : null;
      },
      findUnique: async ({
        where,
      }: {
        where: {
          id?: string;
          fromCharacterId_toCharacterId_type?: {
            fromCharacterId: string;
            toCharacterId: string;
            type: string;
          };
        };
      }) => {
        if (where.id) {
          const row = store.relationships.find((item) => item.id === where.id);
          return row ? withRelationIncludes(row) : null;
        }
        const key = where.fromCharacterId_toCharacterId_type;
        if (!key) {
          return null;
        }
        const row = store.relationships.find(
          (item) =>
            item.fromCharacterId === key.fromCharacterId &&
            item.toCharacterId === key.toCharacterId &&
            item.type === key.type,
        );
        return row ? withRelationIncludes(row) : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: RelationRow = {
          id: `rel-${store.relationships.length + 1}`,
          projectId: String(data.projectId),
          fromCharacterId: String(data.fromCharacterId),
          toCharacterId: String(data.toCharacterId),
          type: String(data.type),
          label: (data.label as string | null) ?? null,
          description: (data.description as string | null) ?? null,
          strength: Number(data.strength ?? 3),
          metadata: data.metadata ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.relationships.push(row);
        return withRelationIncludes(row);
      },
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.relationships.find((item) => item.id === id);
        if (!row) {
          throw new Error("missing");
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return withRelationIncludes(row);
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        store.relationships = store.relationships.filter((item) => item.id !== id);
      },
    },
  };

  return {
    store,
    service: new CharactersService(prisma as never),
  };
}

describe("CharactersService", () => {
  it("creates a character", async () => {
    const { service } = createService();
    const created = await service.create("proj-a", {
      name: "林玄",
      role: "主角",
      civilizationId: "civ-xian",
      factionId: "fac-tian",
    });
    expect(created.name).toBe("林玄");
    expect(created.status).toBe(CharacterStatus.ACTIVE);
    expect(created.civilization?.name).toBe("修仙文明");
    expect(created.faction?.name).toBe("天玄宗");
  });

  it("lists characters with pagination and search", async () => {
    const { service } = createService();
    await service.create("proj-a", { name: "沈星河", role: "主角" });
    await service.create("proj-a", { name: "艾尔", role: "配角" });
    const result = await service.list("proj-a", { search: "沈", page: 1, pageSize: 10 });
    expect(result.total).toBe(1);
    expect(result.items[0]?.name).toBe("沈星河");
    expect(result.page).toBe(1);
  });

  it("rejects a duplicate character name", async () => {
    const { service } = createService();
    await service.create("proj-a", { name: "沈星河" });
    await expect(service.create("proj-a", { name: "沈星河" })).rejects.toMatchObject({
      code: ErrorCodes.CHARACTER_NAME_CONFLICT,
    });
  });

  it("gets a character", async () => {
    const { service } = createService();
    const created = await service.create("proj-a", { name: "艾琳·07" });
    const found = await service.get("proj-a", created.id);
    expect(found.id).toBe(created.id);
    expect(found.name).toBe("艾琳·07");
  });

  it("updates a character", async () => {
    const { service } = createService();
    const created = await service.create("proj-a", { name: "诺亚" });
    const updated = await service.update("proj-a", created.id, {
      role: "配角",
      description: "调查星系碰撞",
    });
    expect(updated.role).toBe("配角");
    expect(updated.description).toBe("调查星系碰撞");
  });

  it("deletes a character", async () => {
    const { service, store } = createService();
    const created = await service.create("proj-a", { name: "临时角色" });
    await service.remove("proj-a", created.id);
    expect(store.characters).toHaveLength(0);
  });

  it("rejects a character that does not belong to the project", async () => {
    const { service } = createService();
    const created = await service.create("proj-a", { name: "林玄" });
    await expect(service.get("proj-b", created.id)).rejects.toMatchObject({
      code: ErrorCodes.CHARACTER_NOT_IN_PROJECT,
    });
  });

  it("rejects a civilization from another project", async () => {
    const { service } = createService();
    await expect(
      service.create("proj-a", {
        name: "林玄",
        civilizationId: "civ-other",
      }),
    ).rejects.toMatchObject({
      code: ErrorCodes.CIVILIZATION_NOT_IN_PROJECT,
    });
  });

  it("rejects a faction from another project", async () => {
    const { service } = createService();
    await expect(
      service.create("proj-a", {
        name: "林玄",
        factionId: "fac-other",
      }),
    ).rejects.toMatchObject({
      code: ErrorCodes.FACTION_NOT_IN_PROJECT,
    });
  });

  it("creates a relationship", async () => {
    const { service } = createService();
    const lin = await service.create("proj-a", { name: "林玄" });
    const airin = await service.create("proj-a", { name: "艾琳·07" });
    const relation = await service.createRelationship("proj-a", {
      fromCharacterId: lin.id,
      toCharacterId: airin.id,
      type: CharacterRelationType.ENEMY,
      description: "双方互相不信任",
      strength: 4,
    });
    expect(relation.type).toBe(CharacterRelationType.ENEMY);
    expect(relation.fromCharacter.name).toBe("林玄");
    expect(relation.toCharacter.name).toBe("艾琳·07");
    expect(relation.strength).toBe(4);
  });

  it("rejects a cross-project relationship", async () => {
    const { service } = createService();
    const lin = await service.create("proj-a", { name: "林玄" });
    const other = await service.create("proj-b", { name: "外来者" });
    await expect(
      service.createRelationship("proj-a", {
        fromCharacterId: lin.id,
        toCharacterId: other.id,
        type: CharacterRelationType.RIVAL,
      }),
    ).rejects.toMatchObject({
      code: ErrorCodes.CHARACTER_NOT_IN_PROJECT,
    });
  });

  it("rejects a self relationship", async () => {
    const { service } = createService();
    const lin = await service.create("proj-a", { name: "林玄" });
    await expect(
      service.createRelationship("proj-a", {
        fromCharacterId: lin.id,
        toCharacterId: lin.id,
        type: CharacterRelationType.FRIEND,
      }),
    ).rejects.toMatchObject({
      code: ErrorCodes.INVALID_CHARACTER_RELATIONSHIP,
    });
  });

  it("cascades relationships when a character is deleted", async () => {
    const { service, store } = createService();
    const lin = await service.create("proj-a", { name: "林玄" });
    const airin = await service.create("proj-a", { name: "艾琳·07" });
    await service.createRelationship("proj-a", {
      fromCharacterId: lin.id,
      toCharacterId: airin.id,
      type: CharacterRelationType.ENEMY,
    });
    await service.remove("proj-a", lin.id);
    expect(store.relationships).toHaveLength(0);
    expect(store.characters.map((item) => item.name)).toEqual(["艾琳·07"]);
  });

  it("rejects a duplicate relationship", async () => {
    const { service } = createService();
    const lin = await service.create("proj-a", { name: "林玄" });
    const airin = await service.create("proj-a", { name: "艾琳·07" });
    await service.createRelationship("proj-a", {
      fromCharacterId: lin.id,
      toCharacterId: airin.id,
      type: CharacterRelationType.FRIEND,
    });
    await expect(
      service.createRelationship("proj-a", {
        fromCharacterId: lin.id,
        toCharacterId: airin.id,
        type: CharacterRelationType.FRIEND,
      }),
    ).rejects.toMatchObject({
      code: ErrorCodes.DUPLICATE_CHARACTER_RELATIONSHIP,
    });
  });

  it("updates a relationship", async () => {
    const { service } = createService();
    const lin = await service.create("proj-a", { name: "林玄" });
    const noah = await service.create("proj-a", { name: "诺亚" });
    const relation = await service.createRelationship("proj-a", {
      fromCharacterId: lin.id,
      toCharacterId: noah.id,
      type: CharacterRelationType.ALLY,
    });
    const updated = await service.updateRelationship("proj-a", relation.id, {
      description: "共同调查星系碰撞",
      strength: 5,
    });
    expect(updated.description).toBe("共同调查星系碰撞");
    expect(updated.strength).toBe(5);
  });

  it("deletes a relationship", async () => {
    const { service, store } = createService();
    const lin = await service.create("proj-a", { name: "林玄" });
    const noah = await service.create("proj-a", { name: "诺亚" });
    const relation = await service.createRelationship("proj-a", {
      fromCharacterId: lin.id,
      toCharacterId: noah.id,
      type: CharacterRelationType.ALLY,
    });
    await service.removeRelationship("proj-a", relation.id);
    expect(store.relationships).toHaveLength(0);
  });

  it("builds character context without calling AI", () => {
    const context = buildCharacterContext({
      name: "林玄",
      alias: "玄子",
      gender: "男",
      age: 19,
      role: "主角",
      status: CharacterStatus.ACTIVE,
      description: "修仙者",
      personality: "隐忍",
      appearance: "青衫",
      background: "天玄宗外门",
      motivation: "追查星系碰撞",
      goal: "守护修仙文明",
      ability: "星河剑意",
      civilization: { id: "civ-xian", name: "修仙文明" },
      faction: { id: "fac-tian", name: "天玄宗" },
    });
    expect(context.civilization).toBe("修仙文明");
    expect(serializeCharacterContext({
      ...context,
      id: "1",
      projectId: "proj-a",
      worldId: null,
      race: null,
      identity: null,
      conflict: null,
      ability: "星河剑意",
      personalityProfile: null,
      appearanceProfile: null,
      abilities: null,
      voiceProfile: null,
      imageProfile: null,
      metadata: null,
      civilizationId: "civ-xian",
      factionId: "fac-tian",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      civilization: { id: "civ-xian", name: "修仙文明" },
      faction: { id: "fac-tian", name: "天玄宗" },
    })).toContain("姓名：林玄");
  });
});

describe("CharactersService errors", () => {
  it("uses AppError codes", async () => {
    const { service } = createService();
    await expect(service.list("missing")).rejects.toBeInstanceOf(AppError);
  });
});
