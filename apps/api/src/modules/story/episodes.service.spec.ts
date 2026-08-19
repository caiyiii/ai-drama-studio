import { describe, expect, it } from "vitest";
import { ErrorCodes } from "../../common/app-error";
import { EpisodesService } from "./episodes.service";
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

type EpisodeRow = {
  id: string;
  projectId: string;
  seasonId: string;
  number: number;
  order: number;
  title: string;
  synopsis: string | null;
  outline: string | null;
  status: string;
  durationSeconds: number | null;
  storyState: unknown;
  continuityNotes: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function createService() {
  const now = new Date();
  const store = {
    projects: [{ id: "proj-a" }, { id: "proj-b" }],
    seasons: [
      {
        id: "season-a",
        projectId: "proj-a",
        number: 1,
        title: "星河初遇",
        synopsis: null,
        outline: null,
        status: "DRAFT",
        metadata: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "season-b",
        projectId: "proj-b",
        number: 1,
        title: "外项目季",
        synopsis: null,
        outline: null,
        status: "DRAFT",
        metadata: null,
        createdAt: now,
        updatedAt: now,
      },
    ] as SeasonRow[],
    episodes: [] as EpisodeRow[],
    tasks: [] as Array<{ projectId: string; type: string; input: unknown }>,
  };

  const prisma = {
    project: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.projects.find((item) => item.id === id) ?? null,
    },
    season: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        const row = store.seasons.find((item) => item.id === id);
        return row ? { ...row, _count: { episodes: 0 } } : null;
      },
      findFirst: async () => null,
    },
    episode: {
      findMany: async ({
        where,
      }: {
        where: { projectId: string; seasonId?: string };
      }) =>
        store.episodes
          .filter(
            (item) =>
              item.projectId === where.projectId &&
              (!where.seasonId || item.seasonId === where.seasonId),
          )
          .sort((a, b) => a.number - b.number),
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.episodes.find((item) => item.id === id) ?? null,
      findFirst: async ({
        where,
      }: {
        where: {
          id?: string | { not: string };
          projectId?: string;
          seasonId?: string;
          number?: number;
        };
      }) => {
        if (typeof where.id === "string") {
          return (
            store.episodes.find(
              (item) =>
                item.id === where.id &&
                (!where.projectId || item.projectId === where.projectId),
            ) ?? null
          );
        }
        const excludeId = typeof where.id === "object" ? where.id.not : undefined;
        return (
          store.episodes.find(
            (item) =>
              item.seasonId === where.seasonId &&
              item.number === where.number &&
              (!excludeId || item.id !== excludeId),
          ) ?? null
        );
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row: EpisodeRow = {
          id: `ep-${store.episodes.length + 1}`,
          projectId: String(data.projectId),
          seasonId: String(data.seasonId),
          number: Number(data.number),
          order: Number(data.order ?? data.number),
          title: String(data.title),
          synopsis: (data.synopsis as string | null) ?? null,
          outline: (data.outline as string | null) ?? null,
          status: String(data.status ?? "DRAFT"),
          durationSeconds: (data.durationSeconds as number | null) ?? null,
          storyState: data.storyState ?? null,
          continuityNotes: (data.continuityNotes as string | null) ?? null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.episodes.push(row);
        return row;
      },
      update: async ({
        where: { id },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.episodes.find((item) => item.id === id);
        if (!row) {
          throw new Error("missing");
        }
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
      delete: async ({ where: { id } }: { where: { id: string } }) => {
        store.episodes = store.episodes.filter((item) => item.id !== id);
      },
    },
    generationTask: {
      findMany: async () => store.tasks,
    },
    script: {
      findUnique: async () => null,
    },
    storyboard: {
      findUnique: async () => null,
    },
    episodeTimeline: {
      findUnique: async () => null,
    },
    episodeAudioAsset: {
      findMany: async () => [],
    },
    renderJob: {
      findMany: async () => [],
    },
    $transaction: async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
  };

  const seasons = new SeasonsService(prisma as never);
  const service = new EpisodesService(prisma as never, seasons);
  return { service, store };
}

describe("EpisodesService", () => {
  it("creates, updates and deletes an episode with storyState", async () => {
    const { service } = createService();
    const created = await service.create("proj-a", "season-a", {
      number: 1,
      title: "星系碰撞",
      durationSeconds: 300,
      storyState: { unresolvedThreads: ["星图失效"] },
    });
    expect(created.storyState?.unresolvedThreads).toEqual(["星图失效"]);
    const updated = await service.update("proj-a", "season-a", created.id, {
      outline: "两星系被拉近",
    });
    expect(updated.outline).toBe("两星系被拉近");
    await service.remove("proj-a", "season-a", created.id);
    expect(await service.list("proj-a", "season-a")).toHaveLength(0);
  });

  it("rejects duplicate episode numbers in the same season", async () => {
    const { service } = createService();
    await service.create("proj-a", "season-a", { number: 1, title: "E01" });
    await expect(
      service.create("proj-a", "season-a", { number: 1, title: "重复" }),
    ).rejects.toMatchObject({ code: ErrorCodes.EPISODE_NUMBER_CONFLICT });
  });

  it("rejects cross-project and cross-season access", async () => {
    const { service } = createService();
    const created = await service.create("proj-a", "season-a", {
      number: 1,
      title: "星系碰撞",
    });
    await expect(
      service.get("proj-b", "season-b", created.id),
    ).rejects.toMatchObject({ code: ErrorCodes.EPISODE_NOT_IN_PROJECT });
    await expect(
      service.create("proj-b", "season-a", { number: 1, title: "非法" }),
    ).rejects.toMatchObject({ code: ErrorCodes.SEASON_NOT_IN_PROJECT });
  });

  it("reorders episode numbers in a transaction", async () => {
    const { service } = createService();
    const first = await service.create("proj-a", "season-a", {
      number: 1,
      title: "A",
    });
    const second = await service.create("proj-a", "season-a", {
      number: 2,
      title: "B",
    });
    const reordered = await service.reorder("proj-a", "season-a", {
      ids: [second.id, first.id],
    });
    expect(reordered.map((item) => item.title)).toEqual(["B", "A"]);
    expect(reordered.map((item) => item.number)).toEqual([1, 2]);
  });

  it("overview is project-isolated and does not leak secrets", async () => {
    const { service } = createService();
    const created = await service.create("proj-a", "season-a", {
      number: 1,
      title: "星门初现",
      synopsis: "发现星门",
      outline: "夜课开场",
    });
    await expect(service.getOverviewByEpisode("proj-b", created.id)).rejects.toMatchObject({
      code: ErrorCodes.EPISODE_NOT_IN_PROJECT,
    });
    const overview = await service.getOverview("proj-a", "season-a", created.id);
    expect(overview.productionStage).toBe("SCRIPTING");
    expect(overview.nextAction.type).toBe("GENERATE_SCRIPT");
    expect(JSON.stringify(overview)).not.toContain("encryptedApiKey");
    expect(JSON.stringify(overview)).not.toContain("sk-");
  });
});
