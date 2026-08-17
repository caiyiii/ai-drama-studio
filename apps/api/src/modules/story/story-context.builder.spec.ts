import { describe, expect, it } from "vitest";
import { StoryContextBuilder } from "./story-context.builder";

function createBuilder() {
  const now = new Date();
  const prisma = {
    project: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        id === "proj-a"
          ? { name: "星河碰撞", description: "两星系被迫靠近", genre: "科幻修仙" }
          : null,
    },
    storyBible: {
      findUnique: async ({ where: { projectId } }: { where: { projectId: string } }) =>
        projectId === "proj-a"
          ? {
              id: "bible-a",
              projectId: "proj-a",
              title: "星河碰撞",
              logline: "两星系被迫靠近",
              premise: null,
              theme: "文明冲突",
              tone: "史诗",
              style: null,
              audience: null,
              storyPromise: null,
              rules: { worldRules: ["灵气与义体互斥"], characterRules: [], narrativeRules: [], forbidden: [] },
              timelineSummary: null,
              continuityNotes: null,
              metadata: null,
              createdAt: now,
              updatedAt: now,
            }
          : null,
    },
    world: {
      findUnique: async ({ where: { projectId } }: { where: { projectId: string } }) =>
        projectId === "proj-a"
          ? {
              title: "星河碰撞",
              summary: "星系相撞",
              cosmicBackground: "轨道扰动",
              coreConflict: "修仙与赛博",
              civilizations: [
                {
                  name: "修仙文明",
                  description: "以自身为炉鼎",
                  philosophy: "问心",
                  technology: "星舟禁制",
                },
              ],
              factions: [{ name: "问天宗", description: "以心证道" }],
              worldLocations: [{ name: "折剑星", description: "母星" }],
              powerSystems: [{ name: "修仙体系", description: "灵气淬炼" }],
            }
          : null,
    },
    character: {
      findMany: async ({ where: { projectId } }: { where: { projectId: string } }) =>
        projectId === "proj-a"
          ? [
              {
                id: "char-1",
                name: "沈星河",
                role: "主角",
                identity: "外门弟子",
                personality: "隐忍",
                goal: "查清碰撞",
                conflict: "信仰撕裂",
                imageProfile: { secret: "no" },
                voiceProfile: { secret: "no" },
                metadata: { dump: true },
              },
            ]
          : [],
    },
    characterRelationship: {
      findMany: async ({ where: { projectId } }: { where: { projectId: string } }) =>
        projectId === "proj-a"
          ? [
              {
                type: "MASTER",
                label: "师徒",
                fromCharacter: { name: "太虚真人" },
                toCharacter: { name: "沈星河" },
              },
            ]
          : [],
    },
    season: {
      findMany: async ({ where: { projectId } }: { where: { projectId: string } }) =>
        projectId === "proj-a"
          ? [
              {
                id: "season-a",
                projectId: "proj-a",
                number: 1,
                title: "星河初遇",
                synopsis: "第一季",
                outline: "接触与结盟",
                status: "DRAFT",
                metadata: null,
                createdAt: now,
                updatedAt: now,
              },
            ]
          : [],
      findFirst: async ({
        where: { id, projectId },
      }: {
        where: { id: string; projectId: string };
      }) =>
        id === "season-a" && projectId === "proj-a"
          ? {
              id: "season-a",
              projectId: "proj-a",
              number: 1,
              title: "星河初遇",
              synopsis: "第一季",
              outline: "接触与结盟",
              status: "DRAFT",
              metadata: null,
              createdAt: now,
              updatedAt: now,
            }
          : null,
    },
    script: {
      findUnique: async ({
        where: { episodeId },
      }: {
        where: { episodeId: string };
      }) =>
        episodeId === "ep-1"
          ? {
              id: "script-1",
              projectId: "proj-a",
              episodeId: "ep-1",
              version: 1,
              status: "READY",
              title: "星系碰撞",
              scenes: [
                {
                  id: "scene-1",
                  number: 1,
                  title: "问天宗夜课",
                  location: "问天宗外门",
                  timeOfDay: "夜",
                  summary: "星图失效",
                  blocks: [
                    {
                      id: "block-1",
                      order: 1,
                      type: "ACTION",
                      content: "沈星河抬头望向天空。",
                      characterId: "char-1",
                      character: { name: "沈星河" },
                    },
                  ],
                },
              ],
            }
          : null,
    },
    episode: {
      findMany: async ({
        where,
      }: {
        where: { projectId: string; seasonId?: string };
      }) => {
        if (where.projectId !== "proj-a") {
          return [];
        }
        const rows = [
          {
            id: "ep-1",
            number: 1,
            title: "星系碰撞",
            synopsis: "星图失效",
            outline: "碰撞开始",
            status: "OUTLINED",
            storyState: { unresolvedThreads: ["星图"] },
          },
          {
            id: "ep-2",
            number: 2,
            title: "第一次接触",
            synopsis: "接触",
            outline: "接触大纲",
            status: "DRAFT",
            storyState: null,
          },
        ];
        return where.seasonId ? rows : rows;
      },
      findFirst: async ({
        where,
      }: {
        where: { id?: string; projectId: string; seasonId?: string; number?: number };
      }) => {
        if (where.projectId !== "proj-a") {
          return null;
        }
        if (where.id === "ep-1") {
          return {
            id: "ep-1",
            projectId: "proj-a",
            seasonId: "season-a",
            number: 1,
            title: "星系碰撞",
            synopsis: "星图失效",
            outline: "碰撞开始",
            status: "OUTLINED",
            storyState: { unresolvedThreads: ["星图"] },
          };
        }
        if (where.id === "ep-2") {
          return {
            id: "ep-2",
            projectId: "proj-a",
            seasonId: "season-a",
            number: 2,
            title: "第一次接触",
            synopsis: "接触",
            outline: "接触大纲",
            status: "DRAFT",
            storyState: null,
          };
        }
        if (where.seasonId === "season-a" && where.number === 1) {
          return {
            id: "ep-1",
            projectId: "proj-a",
            seasonId: "season-a",
            number: 1,
            title: "星系碰撞",
            synopsis: "星图失效",
            outline: "碰撞开始",
            status: "OUTLINED",
            storyState: { unresolvedThreads: ["星图"] },
          };
        }
        return null;
      },
    },
  };
  return new StoryContextBuilder(prisma as never);
}

describe("StoryContextBuilder", () => {
  it("builds a summarized project context without dumping profiles", async () => {
    const builder = createBuilder();
    const context = await builder.buildProjectContext("proj-a");
    expect(context.storyBible?.title).toBe("星河碰撞");
    expect(context.world?.coreConflict).toBe("修仙与赛博");
    expect(context.characters[0]?.name).toBe("沈星河");
    expect(JSON.stringify(context)).not.toContain("imageProfile");
    expect(JSON.stringify(context)).not.toContain("voiceProfile");
  });

  it("builds season and episode context with previous episode", async () => {
    const builder = createBuilder();
    const season = await builder.buildSeasonContext("proj-a", "season-a");
    expect(season.season?.title).toBe("星河初遇");
    const episode = await builder.buildEpisodeContext("proj-a", "ep-2");
    expect(episode.episode?.title).toBe("第一次接触");
    expect(episode.previousEpisode?.title).toBe("星系碰撞");
    expect(episode.previousEpisode?.storyState?.unresolvedThreads).toEqual(["星图"]);
  });

  it("isolates context by project", async () => {
    const builder = createBuilder();
    const other = await builder.buildProjectContext("proj-b");
    expect(other.storyBible).toBeNull();
    expect(other.world).toBeNull();
    expect(other.characters).toHaveLength(0);
    expect(other.seasons).toHaveLength(0);
  });

  it("builds script context with project summary, bible and characters", async () => {
    const builder = createBuilder();
    const context = await builder.buildScriptContext("proj-a", "ep-1");
    expect(context.project?.name).toBe("星河碰撞");
    expect(context.storyBible?.logline).toContain("两星系");
    expect(context.characters[0]?.name).toBe("沈星河");
    expect(context.episode?.outline).toBe("碰撞开始");
    expect(JSON.stringify(context)).not.toContain("imageProfile");
    expect(JSON.stringify(context)).not.toContain("voiceProfile");
    expect(JSON.stringify(context)).not.toContain("API Key");
  });

  it("builds storyboard context with script ids and visual summary without dumping profiles", async () => {
    const builder = createBuilder();
    const context = await builder.buildStoryboardContext("proj-a", "ep-1");
    expect(context.script?.id).toBe("script-1");
    expect(context.script?.scenes[0]?.blocks[0]?.id).toBe("block-1");
    expect(context.characters[0]?.name).toBe("沈星河");
    expect(JSON.stringify(context)).not.toContain("imageProfile");
    expect(JSON.stringify(context)).not.toContain("voiceProfile");
    expect(JSON.stringify(context)).not.toContain('"secret"');
  });
});
