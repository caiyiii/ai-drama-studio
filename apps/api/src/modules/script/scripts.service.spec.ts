import { describe, expect, it } from "vitest";
import { ScriptBlockType } from "@ai-drama-studio/types";
import { ErrorCodes } from "../../common/app-error";
import { ScriptBlocksService } from "./script-blocks.service";
import { ScenesService } from "./scenes.service";
import { ScriptsService } from "./scripts.service";

type ScriptRow = {
  id: string;
  episodeId: string;
  projectId: string;
  title: string;
  version: number;
  status: string;
  logline: string | null;
  summary: string | null;
  estimatedDurationSeconds: number | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type SceneRow = {
  id: string;
  scriptId: string;
  number: number;
  title: string;
  location: string | null;
  timeOfDay: string | null;
  summary: string | null;
  purpose: string | null;
  conflict: string | null;
  estimatedDurationSeconds: number | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type BlockRow = {
  id: string;
  sceneId: string;
  order: number;
  type: string;
  content: string;
  characterId: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function createServices() {
  const now = new Date();
  const store = {
    episodes: [
      { id: "ep-a", projectId: "proj-a" },
      { id: "ep-a2", projectId: "proj-a" },
      { id: "ep-b", projectId: "proj-b" },
    ],
    characters: [
      { id: "char-shen", name: "沈星河", alias: null, role: "主角", projectId: "proj-a" },
      { id: "char-other", name: "外人", alias: null, role: "配角", projectId: "proj-b" },
    ],
    scripts: [] as ScriptRow[],
    scenes: [] as SceneRow[],
    blocks: [] as BlockRow[],
  };

  function attachScript(row: ScriptRow) {
    return {
      ...row,
      scenes: store.scenes
        .filter((item) => item.scriptId === row.id)
        .sort((a, b) => a.number - b.number)
        .map(attachScene),
    };
  }

  function attachScene(row: SceneRow) {
    return {
      ...row,
      blocks: store.blocks
        .filter((item) => item.sceneId === row.id)
        .sort((a, b) => a.order - b.order)
        .map(attachBlock),
    };
  }

  function attachBlock(row: BlockRow) {
    const character = store.characters.find((item) => item.id === row.characterId);
    return {
      ...row,
      character: character
        ? { id: character.id, name: character.name, alias: character.alias, role: character.role }
        : null,
    };
  }

  const prisma = {
    episode: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.episodes.find((item) => item.id === id) ?? null,
    },
    character: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.characters.find((item) => item.id === id) ?? null,
    },
    script: {
      findUnique: async ({ where: { episodeId } }: { where: { episodeId: string } }) => {
        const row = store.scripts.find((item) => item.episodeId === episodeId);
        return row ? attachScript(row) : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: ScriptRow = {
          id: `script-${store.scripts.length + 1}`,
          episodeId: String(data.episodeId),
          projectId: String(data.projectId),
          title: String(data.title),
          version: 1,
          status: String(data.status || "DRAFT"),
          logline: (data.logline as string | null) ?? null,
          summary: (data.summary as string | null) ?? null,
          estimatedDurationSeconds: (data.estimatedDurationSeconds as number | null) ?? null,
          metadata: null,
          createdAt: now,
          updatedAt: now,
        };
        store.scripts.push(row);
        return attachScript(row);
      },
      update: async ({
        where: { episodeId },
        data,
      }: {
        where: { episodeId: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.scripts.find((item) => item.episodeId === episodeId);
        if (!row) {
          throw new Error("missing script");
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return attachScript(row);
      },
      delete: async ({ where: { episodeId } }: { where: { episodeId: string } }) => {
        const script = store.scripts.find((item) => item.episodeId === episodeId);
        store.scripts = store.scripts.filter((item) => item.episodeId !== episodeId);
        if (script) {
          const sceneIds = store.scenes
            .filter((item) => item.scriptId === script.id)
            .map((item) => item.id);
          store.scenes = store.scenes.filter((item) => item.scriptId !== script.id);
          store.blocks = store.blocks.filter((item) => !sceneIds.includes(item.sceneId));
        }
      },
    },
    scene: {
      findMany: async ({ where: { scriptId } }: { where: { scriptId: string } }) =>
        store.scenes
          .filter((item) => item.scriptId === scriptId)
          .sort((a, b) => a.number - b.number)
          .map(attachScene),
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        const row = store.scenes.find((item) => item.id === id);
        return row ? attachScene(row) : null;
      },
      findFirst: async ({
        where,
      }: {
        where: { scriptId: string; number: number; id?: { not: string } };
      }) =>
        store.scenes.find(
          (item) =>
            item.scriptId === where.scriptId &&
            item.number === where.number &&
            item.id !== where.id?.not,
        ) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: SceneRow = {
          id: `scene-${store.scenes.length + 1}`,
          scriptId: String(data.scriptId),
          number: Number(data.number),
          title: String(data.title),
          location: (data.location as string | null) ?? null,
          timeOfDay: (data.timeOfDay as string | null) ?? null,
          summary: (data.summary as string | null) ?? null,
          purpose: (data.purpose as string | null) ?? null,
          conflict: (data.conflict as string | null) ?? null,
          estimatedDurationSeconds: (data.estimatedDurationSeconds as number | null) ?? null,
          metadata: null,
          createdAt: now,
          updatedAt: now,
        };
        store.scenes.push(row);
        return attachScene(row);
      },
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.scenes.find((item) => item.id === id);
        if (!row) {
          throw new Error("missing scene");
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return attachScene(row);
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        store.scenes = store.scenes.filter((item) => item.id !== id);
        store.blocks = store.blocks.filter((item) => item.sceneId !== id);
      },
    },
    scriptBlock: {
      findMany: async ({ where: { sceneId } }: { where: { sceneId: string } }) =>
        store.blocks
          .filter((item) => item.sceneId === sceneId)
          .sort((a, b) => a.order - b.order)
          .map(attachBlock),
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        const row = store.blocks.find((item) => item.id === id);
        return row ? attachBlock(row) : null;
      },
      findFirst: async ({
        where,
      }: {
        where: { sceneId: string; order: number; id?: { not: string } };
      }) =>
        store.blocks.find(
          (item) =>
            item.sceneId === where.sceneId &&
            item.order === where.order &&
            item.id !== where.id?.not,
        ) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: BlockRow = {
          id: `block-${store.blocks.length + 1}`,
          sceneId: String(data.sceneId),
          order: Number(data.order),
          type: String(data.type),
          content: String(data.content),
          characterId: (data.characterId as string | null) ?? null,
          metadata: data.metadata ?? null,
          createdAt: now,
          updatedAt: now,
        };
        store.blocks.push(row);
        return attachBlock(row);
      },
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.blocks.find((item) => item.id === id);
        if (!row) {
          throw new Error("missing block");
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return attachBlock(row);
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        store.blocks = store.blocks.filter((item) => item.id !== id);
      },
    },
    $transaction: async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
  };

  const scripts = new ScriptsService(prisma as never);
  const scenes = new ScenesService(prisma as never, scripts);
  const blocks = new ScriptBlocksService(prisma as never, scripts, scenes);
  return { scripts, scenes, blocks, store };
}

describe("Script CRUD and isolation", () => {
  it("creates and reads a script scoped to project + episode", async () => {
    const { scripts } = createServices();
    const created = await scripts.create("proj-a", "ep-a", { title: "星系碰撞" });
    expect(created.title).toBe("星系碰撞");
    const loaded = await scripts.get("proj-a", "ep-a");
    expect(loaded.id).toBe(created.id);
  });

  it("enforces one script per episode", async () => {
    const { scripts } = createServices();
    await scripts.create("proj-a", "ep-a", { title: "v1" });
    await expect(scripts.create("proj-a", "ep-a", { title: "v2" })).rejects.toMatchObject({
      code: ErrorCodes.SCRIPT_ALREADY_EXISTS,
    });
  });

  it("rejects cross-project episode access", async () => {
    const { scripts } = createServices();
    await expect(scripts.get("proj-a", "ep-b")).rejects.toMatchObject({
      code: ErrorCodes.PROJECT_EPISODE_MISMATCH,
    });
    await expect(scripts.create("proj-a", "ep-b", { title: "偷跨项目" })).rejects.toMatchObject({
      code: ErrorCodes.PROJECT_EPISODE_MISMATCH,
    });
  });

  it("returns SCRIPT_NOT_FOUND for missing scripts", async () => {
    const { scripts } = createServices();
    await expect(scripts.get("proj-a", "ep-a")).rejects.toMatchObject({
      code: ErrorCodes.SCRIPT_NOT_FOUND,
    });
  });

  it("isolates scripts by episode", async () => {
    const { scripts } = createServices();
    await scripts.create("proj-a", "ep-a", { title: "第一集" });
    await scripts.create("proj-a", "ep-a2", { title: "第二集" });
    expect((await scripts.get("proj-a", "ep-a")).title).toBe("第一集");
    expect((await scripts.get("proj-a", "ep-a2")).title).toBe("第二集");
  });
});

describe("Scene and ScriptBlock CRUD", () => {
  it("creates ordered scenes and blocks", async () => {
    const { scripts, scenes, blocks } = createServices();
    await scripts.create("proj-a", "ep-a", { title: "星系碰撞" });
    const scene = await scenes.create("proj-a", "ep-a", { number: 1, title: "夜课" });
    const dialogue = await blocks.create("proj-a", "ep-a", scene.id, {
      order: 1,
      type: ScriptBlockType.DIALOGUE,
      content: "那是什么？",
      characterId: "char-shen",
    });
    expect(dialogue.characterId).toBe("char-shen");
    expect(dialogue.character?.name).toBe("沈星河");
    await expect(
      scenes.create("proj-a", "ep-a", { number: 1, title: "重复" }),
    ).rejects.toMatchObject({ code: ErrorCodes.SCENE_NUMBER_CONFLICT });
    await expect(
      blocks.create("proj-a", "ep-a", scene.id, {
        order: 1,
        type: ScriptBlockType.ACTION,
        content: "重复",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.SCRIPT_BLOCK_ORDER_CONFLICT });
  });

  it("reorders scenes and blocks stably", async () => {
    const { scripts, scenes, blocks } = createServices();
    await scripts.create("proj-a", "ep-a", { title: "星系碰撞" });
    const first = await scenes.create("proj-a", "ep-a", { number: 1, title: "A" });
    const second = await scenes.create("proj-a", "ep-a", { number: 2, title: "B" });
    const reordered = await scenes.reorder("proj-a", "ep-a", { ids: [second.id, first.id] });
    expect(reordered.map((item) => item.title)).toEqual(["B", "A"]);
    expect(reordered.map((item) => item.number)).toEqual([1, 2]);

    const b1 = await blocks.create("proj-a", "ep-a", first.id, {
      order: 1,
      type: ScriptBlockType.ACTION,
      content: "一",
    });
    const b2 = await blocks.create("proj-a", "ep-a", first.id, {
      order: 2,
      type: ScriptBlockType.NARRATION,
      content: "二",
    });
    const blocksReordered = await blocks.reorder("proj-a", "ep-a", first.id, {
      ids: [b2.id, b1.id],
    });
    expect(blocksReordered.map((item) => item.content)).toEqual(["二", "一"]);
    expect(blocksReordered.map((item) => item.order)).toEqual([1, 2]);
  });

  it("rejects cross-project character association", async () => {
    const { scripts, scenes, blocks } = createServices();
    await scripts.create("proj-a", "ep-a", { title: "星系碰撞" });
    const scene = await scenes.create("proj-a", "ep-a", { number: 1, title: "夜课" });
    await expect(
      blocks.create("proj-a", "ep-a", scene.id, {
        order: 1,
        type: ScriptBlockType.DIALOGUE,
        content: "跨项目",
        characterId: "char-other",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.CHARACTER_NOT_IN_PROJECT });
  });

  it("rejects missing characters", async () => {
    const { scripts, scenes, blocks } = createServices();
    await scripts.create("proj-a", "ep-a", { title: "星系碰撞" });
    const scene = await scenes.create("proj-a", "ep-a", { number: 1, title: "夜课" });
    await expect(
      blocks.create("proj-a", "ep-a", scene.id, {
        order: 1,
        type: ScriptBlockType.DIALOGUE,
        content: "不存在",
        characterId: "missing",
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.CHARACTER_NOT_FOUND });
  });
});
