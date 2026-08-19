import { describe, expect, it } from "vitest";
import {
  CameraAngle,
  CameraMovement,
  StoryboardShotSize,
  StoryboardShotType,
  StoryboardStatus,
} from "@ai-drama-studio/types";
import { ErrorCodes } from "../../common/app-error";
import { StoryboardShotsService } from "./storyboard-shots.service";
import { StoryboardsService } from "./storyboards.service";

type BoardRow = {
  id: string;
  episodeId: string;
  projectId: string;
  version: number;
  status: string;
  title: string;
  description: string | null;
  totalDurationSeconds: number | null;
  sourceScriptVersion: number;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type ShotRow = {
  id: string;
  storyboardId: string;
  sceneId: string | null;
  scriptBlockId: string | null;
  shotNumber: number;
  shotType: string;
  shotSize: string;
  cameraMovement: string;
  cameraAngle: string;
  composition: string | null;
  visualDescription: string;
  characterIds: unknown;
  location: string | null;
  action: string | null;
  dialogue: string | null;
  narration: string | null;
  direction: string | null;
  durationSeconds: number;
  transition: string;
  lighting: string | null;
  mood: string | null;
  visualStyle: string | null;
  imagePrompt: string | null;
  videoPrompt: string | null;
  negativePrompt: string | null;
  continuityNotes: string | null;
  cameraMovementParams: unknown;
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
    scripts: [
      { id: "script-a", episodeId: "ep-a", projectId: "proj-a", version: 1, status: "READY" },
      { id: "script-a2", episodeId: "ep-a2", projectId: "proj-a", version: 2, status: "READY" },
    ],
    scenes: [
      { id: "scene-a", scriptId: "script-a" },
      { id: "scene-b", scriptId: "script-other" },
    ],
    blocks: [
      { id: "block-a", sceneId: "scene-a" },
      { id: "block-b", sceneId: "scene-b" },
    ],
    characters: [
      { id: "char-shen", projectId: "proj-a" },
      { id: "char-other", projectId: "proj-b" },
    ],
    boards: [] as BoardRow[],
    shots: [] as ShotRow[],
  };

  function attachBoard(row: BoardRow) {
    return {
      ...row,
      shots: store.shots
        .filter((item) => item.storyboardId === row.id)
        .sort((a, b) => a.shotNumber - b.shotNumber),
    };
  }

  const prisma = {
    episode: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.episodes.find((item) => item.id === id) ?? null,
    },
    script: {
      findUnique: async ({ where: { episodeId } }: { where: { episodeId: string } }) =>
        store.scripts.find((item) => item.episodeId === episodeId) ?? null,
    },
    scene: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.scenes.find((item) => item.id === id) ?? null,
    },
    scriptBlock: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.blocks.find((item) => item.id === id) ?? null,
    },
    character: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.characters.find((item) => item.id === id) ?? null,
    },
    storyboard: {
      findUnique: async ({ where: { episodeId } }: { where: { episodeId: string } }) => {
        const row = store.boards.find((item) => item.episodeId === episodeId);
        return row ? attachBoard(row) : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: BoardRow = {
          id: `board-${store.boards.length + 1}`,
          episodeId: String(data.episodeId),
          projectId: String(data.projectId),
          version: 1,
          status: String(data.status || "DRAFT"),
          title: String(data.title),
          description: (data.description as string | null) ?? null,
          totalDurationSeconds: (data.totalDurationSeconds as number | null) ?? null,
          sourceScriptVersion: Number(data.sourceScriptVersion || 1),
          metadata: null,
          createdAt: now,
          updatedAt: now,
        };
        store.boards.push(row);
        return attachBoard(row);
      },
      update: async ({
        where: { episodeId },
        data,
      }: {
        where: { episodeId: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.boards.find((item) => item.episodeId === episodeId);
        if (!row) {
          throw new Error("missing board");
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return attachBoard(row);
      },
      delete: async ({ where: { episodeId } }: { where: { episodeId: string } }) => {
        const board = store.boards.find((item) => item.episodeId === episodeId);
        store.boards = store.boards.filter((item) => item.episodeId !== episodeId);
        if (board) {
          store.shots = store.shots.filter((item) => item.storyboardId !== board.id);
        }
      },
    },
    storyboardShot: {
      findMany: async ({
        where: { storyboardId },
      }: {
        where: { storyboardId: string };
      }) =>
        store.shots
          .filter((item) => item.storyboardId === storyboardId)
          .sort((a, b) => a.shotNumber - b.shotNumber),
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.shots.find((item) => item.id === id) ?? null,
      findFirst: async ({
        where,
      }: {
        where: { storyboardId: string; shotNumber: number; id?: { not: string } };
      }) =>
        store.shots.find(
          (item) =>
            item.storyboardId === where.storyboardId &&
            item.shotNumber === where.shotNumber &&
            item.id !== where.id?.not,
        ) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: ShotRow = {
          id: `shot-${store.shots.length + 1}`,
          storyboardId: String(data.storyboardId),
          sceneId: (data.sceneId as string | null) ?? null,
          scriptBlockId: (data.scriptBlockId as string | null) ?? null,
          shotNumber: Number(data.shotNumber),
          shotType: String(data.shotType),
          shotSize: String(data.shotSize),
          cameraMovement: String(data.cameraMovement),
          cameraAngle: String(data.cameraAngle),
          composition: (data.composition as string | null) ?? null,
          visualDescription: String(data.visualDescription),
          characterIds: data.characterIds ?? [],
          location: (data.location as string | null) ?? null,
          action: (data.action as string | null) ?? null,
          dialogue: (data.dialogue as string | null) ?? null,
          narration: (data.narration as string | null) ?? null,
          direction: (data.direction as string | null) ?? null,
          durationSeconds: Number(data.durationSeconds),
          transition: String(data.transition || "CUT"),
          lighting: (data.lighting as string | null) ?? null,
          mood: (data.mood as string | null) ?? null,
          visualStyle: (data.visualStyle as string | null) ?? null,
          imagePrompt: (data.imagePrompt as string | null) ?? null,
          videoPrompt: (data.videoPrompt as string | null) ?? null,
          negativePrompt: (data.negativePrompt as string | null) ?? null,
          continuityNotes: (data.continuityNotes as string | null) ?? null,
          cameraMovementParams: data.cameraMovementParams ?? null,
          metadata: data.metadata ?? null,
          createdAt: now,
          updatedAt: now,
        };
        store.shots.push(row);
        return row;
      },
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.shots.find((item) => item.id === id);
        if (!row) {
          throw new Error("missing shot");
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        store.shots = store.shots.filter((item) => item.id !== id);
      },
    },
    $transaction: async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
  };

  const storyboards = new StoryboardsService(prisma as never);
  const shots = new StoryboardShotsService(prisma as never, storyboards);
  return { storyboards, shots, store };
}

const shotBase = {
  shotType: StoryboardShotType.WIDE,
  shotSize: StoryboardShotSize.WIDE,
  cameraMovement: CameraMovement.STATIC,
  cameraAngle: CameraAngle.EYE_LEVEL,
  visualDescription: "远景建立",
  durationSeconds: 4,
};

describe("Storyboard CRUD and isolation", () => {
  it("creates and reads a storyboard scoped to project + episode", async () => {
    const { storyboards } = createServices();
    const created = await storyboards.create("proj-a", "ep-a", { title: "E01 分镜" });
    expect(created.title).toBe("E01 分镜");
    expect(created.sourceScriptVersion).toBe(1);
    expect(created.stale).toBe(false);
    const loaded = await storyboards.get("proj-a", "ep-a");
    expect(loaded.id).toBe(created.id);
  });

  it("enforces one storyboard per episode", async () => {
    const { storyboards } = createServices();
    await storyboards.create("proj-a", "ep-a", { title: "v1" });
    await expect(storyboards.create("proj-a", "ep-a", { title: "v2" })).rejects.toMatchObject({
      code: ErrorCodes.STORYBOARD_ALREADY_EXISTS,
    });
  });

  it("rejects cross-project episode access", async () => {
    const { storyboards } = createServices();
    await expect(storyboards.get("proj-a", "ep-b")).rejects.toMatchObject({
      code: ErrorCodes.PROJECT_EPISODE_MISMATCH,
    });
  });

  it("requires a script before creating a storyboard", async () => {
    const { storyboards, store } = createServices();
    store.scripts = [];
    await expect(storyboards.create("proj-a", "ep-a", { title: "无剧本" })).rejects.toMatchObject({
      code: ErrorCodes.SCRIPT_REQUIRED_FOR_STORYBOARD,
    });
  });

  it("marks stale when script version changes", async () => {
    const { storyboards, store } = createServices();
    await storyboards.create("proj-a", "ep-a", { title: "E01 分镜" });
    store.scripts[0]!.version = 3;
    const loaded = await storyboards.get("proj-a", "ep-a");
    expect(loaded.stale).toBe(true);
    expect(loaded.sourceScriptVersion).toBe(1);
  });
});

describe("StoryboardShot CRUD", () => {
  it("creates multiple shots from one ScriptBlock and reorders them", async () => {
    const { storyboards, shots } = createServices();
    await storyboards.create("proj-a", "ep-a", { title: "E01 分镜" });
    const first = await shots.create("proj-a", "ep-a", {
      shotNumber: 1,
      sceneId: "scene-a",
      scriptBlockId: "block-a",
      ...shotBase,
    });
    const second = await shots.create("proj-a", "ep-a", {
      shotNumber: 2,
      sceneId: "scene-a",
      scriptBlockIds: ["block-a"],
      ...shotBase,
      shotType: StoryboardShotType.CLOSE_UP,
      shotSize: StoryboardShotSize.CLOSE_UP,
      visualDescription: "特写",
      durationSeconds: 2,
    });
    expect(first.scriptBlockId).toBe("block-a");
    expect(second.scriptBlockId).toBe("block-a");
    const reordered = await shots.reorder("proj-a", "ep-a", { ids: [second.id, first.id] });
    expect(reordered.map((item) => item.id)).toEqual([second.id, first.id]);
    expect(reordered.map((item) => item.shotNumber)).toEqual([1, 2]);
  });

  it("rejects cross-project scene, script block and character", async () => {
    const { storyboards, shots } = createServices();
    await storyboards.create("proj-a", "ep-a", { title: "E01 分镜" });
    await expect(
      shots.create("proj-a", "ep-a", {
        shotNumber: 1,
        sceneId: "scene-b",
        ...shotBase,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.STORYBOARD_INVALID_SCENE });
    await expect(
      shots.create("proj-a", "ep-a", {
        shotNumber: 1,
        sceneId: "scene-a",
        scriptBlockId: "block-b",
        ...shotBase,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.STORYBOARD_INVALID_SCRIPT_BLOCK });
    await expect(
      shots.create("proj-a", "ep-a", {
        shotNumber: 1,
        sceneId: "scene-a",
        scriptBlockId: "block-a",
        characterIds: ["char-other"],
        ...shotBase,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.STORYBOARD_INVALID_CHARACTER });
  });

  it("updates shot fields without changing scene or script block ids", async () => {
    const { storyboards, shots } = createServices();
    await storyboards.create("proj-a", "ep-a", { title: "E01 分镜" });
    const created = await shots.create("proj-a", "ep-a", {
      shotNumber: 1,
      sceneId: "scene-a",
      scriptBlockId: "block-a",
      ...shotBase,
    });
    const updated = await shots.update("proj-a", "ep-a", created.id, {
      durationSeconds: 8,
      imagePrompt: "wide night city",
    });
    expect(updated.durationSeconds).toBe(8);
    expect(updated.sceneId).toBe("scene-a");
    expect(updated.scriptBlockId).toBe("block-a");
  });

  it("rejects editing a locked storyboard except unlock", async () => {
    const { storyboards, shots } = createServices();
    await storyboards.create("proj-a", "ep-a", { title: "E01 分镜" });
    await storyboards.update("proj-a", "ep-a", { status: StoryboardStatus.LOCKED });
    await expect(
      shots.create("proj-a", "ep-a", {
        shotNumber: 1,
        sceneId: "scene-a",
        ...shotBase,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.STORYBOARD_LOCKED });
    const unlocked = await storyboards.update("proj-a", "ep-a", {
      status: StoryboardStatus.READY,
    });
    expect(unlocked.status).toBe(StoryboardStatus.READY);
  });
});
