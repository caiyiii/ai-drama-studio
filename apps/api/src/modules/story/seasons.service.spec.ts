import { describe, expect, it } from "vitest";
import { ErrorCodes } from "../../common/app-error";
import { SeasonsService } from "./seasons.service";

type SeasonRow = {
  id: string;
  projectId: string;
  number: number;
  title: string;
  synopsis: string | null;
  outline: string | null;
  status: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function createService() {
  const store = {
    projects: [{ id: "proj-a" }, { id: "proj-b" }],
    seasons: [] as SeasonRow[],
    episodeCounts: new Map<string, number>(),
  };
  const prisma = {
    project: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.projects.find((item) => item.id === id) ?? null,
    },
    season: {
      findMany: async ({ where: { projectId } }: { where: { projectId: string } }) =>
        store.seasons
          .filter((item) => item.projectId === projectId)
          .map((item) => ({
            ...item,
            _count: { episodes: store.episodeCounts.get(item.id) ?? 0 },
          })),
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        const row = store.seasons.find((item) => item.id === id);
        return row
          ? { ...row, _count: { episodes: store.episodeCounts.get(row.id) ?? 0 } }
          : null;
      },
      findFirst: async ({
        where,
      }: {
        where: { projectId: string; number: number; id?: { not: string } };
      }) =>
        store.seasons.find(
          (item) =>
            item.projectId === where.projectId &&
            item.number === where.number &&
            (!where.id || item.id !== where.id.not),
        ) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: SeasonRow = {
          id: `season-${store.seasons.length + 1}`,
          projectId: String(data.projectId),
          number: Number(data.number),
          title: String(data.title),
          synopsis: (data.synopsis as string | null) ?? null,
          outline: (data.outline as string | null) ?? null,
          status: String(data.status ?? "DRAFT"),
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.seasons.push(row);
        return { ...row, _count: { episodes: 0 } };
      },
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.seasons.find((item) => item.id === id);
        if (!row) {
          throw new Error("missing");
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return {
          ...row,
          _count: { episodes: store.episodeCounts.get(row.id) ?? 0 },
        };
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        store.seasons = store.seasons.filter((item) => item.id !== id);
      },
    },
    episode: {
      count: async ({ where: { seasonId } }: { where: { seasonId: string } }) =>
        store.episodeCounts.get(seasonId) ?? 0,
    },
  };
  return { service: new SeasonsService(prisma as never), store };
}

describe("SeasonsService", () => {
  it("creates, lists, updates and deletes a season", async () => {
    const { service } = createService();
    const created = await service.create("proj-a", {
      number: 1,
      title: "星河初遇",
    });
    expect(created.number).toBe(1);
    const list = await service.list("proj-a");
    expect(list).toHaveLength(1);
    const updated = await service.update("proj-a", created.id, {
      synopsis: "第一季",
    });
    expect(updated.synopsis).toBe("第一季");
    await service.remove("proj-a", created.id);
    expect(await service.list("proj-a")).toHaveLength(0);
  });

  it("rejects duplicate season numbers in the same project", async () => {
    const { service } = createService();
    await service.create("proj-a", { number: 1, title: "一" });
    await expect(
      service.create("proj-a", { number: 1, title: "重复" }),
    ).rejects.toMatchObject({ code: ErrorCodes.SEASON_NUMBER_CONFLICT });
  });

  it("isolates seasons by project", async () => {
    const { service } = createService();
    const created = await service.create("proj-a", { number: 1, title: "星河初遇" });
    await expect(service.get("proj-b", created.id)).rejects.toMatchObject({
      code: ErrorCodes.SEASON_NOT_IN_PROJECT,
    });
    expect(await service.list("proj-b")).toHaveLength(0);
  });

  it("rejects deleting a season that still has episodes", async () => {
    const { service, store } = createService();
    const created = await service.create("proj-a", { number: 1, title: "星河初遇" });
    store.episodeCounts.set(created.id, 2);
    await expect(service.remove("proj-a", created.id)).rejects.toMatchObject({
      code: ErrorCodes.SEASON_HAS_EPISODES,
    });
  });
});
