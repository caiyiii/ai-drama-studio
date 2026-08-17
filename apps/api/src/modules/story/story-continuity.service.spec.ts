import { describe, expect, it } from "vitest";
import {
  episodeBelongsToProject,
  episodeBelongsToSeason,
  seasonBelongsToProject,
} from "@ai-drama-studio/core";
import { ErrorCodes } from "../../common/app-error";
import { StoryContinuityService } from "./story-continuity.service";

function createService() {
  const now = new Date();
  const prisma = {
    episode: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        if (id === "ep-2") {
          return {
            id: "ep-2",
            projectId: "proj-a",
            seasonId: "season-a",
            number: 2,
            title: "第一次接触",
            synopsis: null,
            outline: null,
            status: "DRAFT",
            durationSeconds: 300,
            storyState: { unresolvedThreads: ["接触后的信任"] },
            continuityNotes: null,
            metadata: null,
            createdAt: now,
            updatedAt: now,
          };
        }
        if (id === "ep-foreign") {
          return {
            id: "ep-foreign",
            projectId: "proj-b",
            seasonId: "season-b",
            number: 1,
            title: "外项目",
            synopsis: null,
            outline: null,
            status: "DRAFT",
            durationSeconds: null,
            storyState: null,
            continuityNotes: null,
            metadata: null,
            createdAt: now,
            updatedAt: now,
          };
        }
        return null;
      },
      findFirst: async ({
        where,
      }: {
        where: { seasonId: string; number: number };
      }) =>
        where.seasonId === "season-a" && where.number === 1
          ? {
              storyState: {
                characters: [{ name: "沈星河", state: "炼气三层" }],
                unresolvedThreads: ["星图失效"],
              },
            }
          : null,
      findMany: async ({ where: { seasonId } }: { where: { seasonId: string } }) =>
        seasonId === "season-a"
          ? [
              { id: "ep-1", number: 1, projectId: "proj-a", seasonId: "season-a" },
              { id: "ep-2", number: 2, projectId: "proj-a", seasonId: "season-a" },
              { id: "ep-4", number: 4, projectId: "proj-a", seasonId: "season-a" },
            ]
          : [],
    },
    season: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        if (id === "season-a") {
          return { id: "season-a", projectId: "proj-a", title: "星河初遇" };
        }
        if (id === "season-b") {
          return { id: "season-b", projectId: "proj-b", title: "外项目季" };
        }
        return null;
      },
    },
    world: {
      findUnique: async ({ where: { projectId } }: { where: { projectId: string } }) =>
        projectId === "proj-a" ? { id: "world-a", projectId: "proj-a" } : null,
    },
    character: {
      findMany: async ({ where: { projectId } }: { where: { projectId: string } }) =>
        projectId === "proj-a"
          ? [{ id: "char-1", projectId: "proj-a" }]
          : [],
    },
  };
  return new StoryContinuityService(prisma as never);
}

describe("StoryContinuityService", () => {
  it("reads previous episode story state", async () => {
    const service = createService();
    const previous = await service.getPreviousEpisodeState("season-a", 2);
    expect(previous?.unresolvedThreads).toEqual(["星图失效"]);
    expect(await service.getPreviousEpisodeState("season-a", 1)).toBeNull();
  });

  it("rejects episode that does not belong to the project", async () => {
    const service = createService();
    await expect(service.getEpisodeContext("proj-a", "ep-foreign")).rejects.toMatchObject({
      code: ErrorCodes.EPISODE_NOT_IN_PROJECT,
    });
  });

  it("validates season/project isolation and episode number gaps", async () => {
    const service = createService();
    const ok = await service.validateEpisodeContinuity("proj-a", "season-a", "ep-2");
    expect(ok.ok).toBe(true);
    expect(ok.warnings.some((item) => item.includes("不连续"))).toBe(true);
    const foreign = await service.validateEpisodeContinuity("proj-a", "season-b");
    expect(foreign.ok).toBe(false);
    expect(foreign.errors.join("")).toContain("季不属于当前项目");
  });

  it("exposes pure continuity helpers", () => {
    expect(episodeBelongsToSeason({ seasonId: "s1" }, "s1")).toBe(true);
    expect(seasonBelongsToProject({ projectId: "p1" }, "p2")).toBe(false);
    expect(episodeBelongsToProject({ projectId: "p1" }, "p1")).toBe(true);
  });
});
