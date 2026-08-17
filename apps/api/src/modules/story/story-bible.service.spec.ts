import { describe, expect, it } from "vitest";
import { ErrorCodes } from "../../common/app-error";
import { StoryBibleService } from "./story-bible.service";

type BibleRow = {
  id: string;
  projectId: string;
  title: string;
  logline: string | null;
  premise: string | null;
  theme: string | null;
  tone: string | null;
  style: string | null;
  audience: string | null;
  storyPromise: string | null;
  rules: unknown;
  timelineSummary: string | null;
  continuityNotes: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function createService() {
  const store = {
    projects: [{ id: "proj-a" }, { id: "proj-b" }],
    bibles: [] as BibleRow[],
  };
  const prisma = {
    project: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.projects.find((item) => item.id === id) ?? null,
    },
    storyBible: {
      findUnique: async ({
        where: { projectId },
      }: {
        where: { projectId: string };
      }) => store.bibles.find((item) => item.projectId === projectId) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: BibleRow = {
          id: `bible-${store.bibles.length + 1}`,
          projectId: String(data.projectId),
          title: String(data.title),
          logline: (data.logline as string | null) ?? null,
          premise: (data.premise as string | null) ?? null,
          theme: (data.theme as string | null) ?? null,
          tone: (data.tone as string | null) ?? null,
          style: (data.style as string | null) ?? null,
          audience: (data.audience as string | null) ?? null,
          storyPromise: (data.storyPromise as string | null) ?? null,
          rules: data.rules ?? null,
          timelineSummary: (data.timelineSummary as string | null) ?? null,
          continuityNotes: (data.continuityNotes as string | null) ?? null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.bibles.push(row);
        return row;
      },
      update: async ({
        where: { projectId },
        data,
      }: {
        where: { projectId: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.bibles.find((item) => item.projectId === projectId);
        if (!row) {
          throw new Error("missing");
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      delete: async ({ where: { projectId } }: { where: { projectId: string } }) => {
        store.bibles = store.bibles.filter((item) => item.projectId !== projectId);
      },
    },
  };
  return { service: new StoryBibleService(prisma as never), store };
}

describe("StoryBibleService", () => {
  it("creates and returns a story bible", async () => {
    const { service } = createService();
    const created = await service.create("proj-a", {
      title: "星河碰撞",
      logline: "两星系被迫靠近",
    });
    expect(created.title).toBe("星河碰撞");
    expect(created.projectId).toBe("proj-a");
    const fetched = await service.get("proj-a");
    expect(fetched.id).toBe(created.id);
  });

  it("rejects duplicate create for the same project", async () => {
    const { service } = createService();
    await service.create("proj-a", { title: "星河碰撞" });
    await expect(service.create("proj-a", { title: "另一本" })).rejects.toMatchObject({
      code: ErrorCodes.STORY_BIBLE_EXISTS,
    });
  });

  it("updates and deletes without touching other projects", async () => {
    const { service, store } = createService();
    await service.create("proj-a", { title: "星河碰撞" });
    await service.create("proj-b", { title: "外项目圣经" });
    const updated = await service.update("proj-a", { theme: "文明冲突" });
    expect(updated.theme).toBe("文明冲突");
    await service.remove("proj-a");
    await expect(service.get("proj-a")).rejects.toMatchObject({
      code: ErrorCodes.STORY_BIBLE_NOT_FOUND,
    });
    expect(store.bibles).toHaveLength(1);
    expect(store.bibles[0]?.projectId).toBe("proj-b");
  });

  it("isolates story bible by project", async () => {
    const { service } = createService();
    await service.create("proj-a", { title: "星河碰撞" });
    await expect(service.get("proj-b")).rejects.toMatchObject({
      code: ErrorCodes.STORY_BIBLE_NOT_FOUND,
    });
  });
});
