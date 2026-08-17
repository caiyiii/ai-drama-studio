import { Injectable } from "@nestjs/common";
import {
  summarizeCharacterForStory,
  summarizeCharacterForStoryboard,
} from "@ai-drama-studio/core";
import type {
  ScriptStatus,
  StoryboardScriptContext,
  StoryCharacterSummary,
  StoryContext,
  StoryEpisodeSummary,
} from "@ai-drama-studio/types";
import { PrismaService } from "../../prisma/prisma.service";
import { asStoryState, mapSeason, mapStoryBible } from "./story.mapper";

@Injectable()
export class StoryContextBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async buildStoryBibleContext(projectId: string): Promise<Pick<StoryContext, "storyBible">> {
    const storyBible = await this.prisma.storyBible.findUnique({
      where: { projectId },
    });
    return { storyBible: storyBible ? mapStoryBible(storyBible) : null };
  }

  async buildWorldContext(projectId: string) {
    const world = await this.prisma.world.findUnique({
      where: { projectId },
      include: {
        civilizations: { orderBy: { createdAt: "asc" } },
        factions: { orderBy: { createdAt: "asc" } },
        worldLocations: { orderBy: { createdAt: "asc" } },
        powerSystems: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!world) {
      return {
        world: null,
        civilizations: [],
        factions: [],
        locations: [],
        powerSystems: [],
      };
    }
    return {
      world: {
        title: world.title,
        summary: world.summary,
        cosmicBackground: world.cosmicBackground,
        coreConflict: world.coreConflict,
      },
      civilizations: world.civilizations.map((item) => ({
        name: item.name,
        description: item.description,
        philosophy: item.philosophy,
        technology: item.technology,
      })),
      factions: world.factions.map((item) => ({
        name: item.name,
        description: item.description,
      })),
      locations: world.worldLocations.map((item) => ({
        name: item.name,
        description: item.description,
      })),
      powerSystems: world.powerSystems.map((item) => ({
        name: item.name,
        description: item.description,
      })),
    };
  }

  async buildCharacterContext(projectId: string) {
    const [characters, relationships] = await Promise.all([
      this.prisma.character.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.characterRelationship.findMany({
        where: { projectId },
        include: {
          fromCharacter: { select: { name: true } },
          toCharacter: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    return {
      characters: characters.map(
        (item): StoryCharacterSummary =>
          summarizeCharacterForStory({
            id: item.id,
            name: item.name,
            role: item.role,
            identity: item.identity,
            personality: item.personality,
            goal: item.goal,
            conflict: item.conflict,
          }),
      ),
      relationships: relationships.map((item) => ({
        fromName: item.fromCharacter.name,
        toName: item.toCharacter.name,
        type: item.type,
        label: item.label,
      })),
    };
  }

  async buildSeasonContext(projectId: string, seasonId: string): Promise<StoryContext> {
    const base = await this.buildProjectContext(projectId);
    const season = await this.prisma.season.findFirst({
      where: { id: seasonId, projectId },
    });
    const episodes = await this.prisma.episode.findMany({
      where: { projectId, seasonId },
      orderBy: { number: "asc" },
      select: {
        id: true,
        number: true,
        title: true,
        synopsis: true,
        outline: true,
        status: true,
        storyState: true,
      },
    });
    return {
      ...base,
      season: season ? mapSeason(season) : null,
      episodes: episodes.map(mapEpisodeSummary),
    };
  }

  async buildEpisodeContext(
    projectId: string,
    episodeId: string,
  ): Promise<StoryContext> {
    const episode = await this.prisma.episode.findFirst({
      where: { id: episodeId, projectId },
    });
    const context = episode
      ? await this.buildSeasonContext(projectId, episode.seasonId)
      : await this.buildProjectContext(projectId);
    const previous = episode
      ? await this.prisma.episode.findFirst({
          where: {
            projectId,
            seasonId: episode.seasonId,
            number: episode.number - 1,
          },
        })
      : null;
    return {
      ...context,
      episode: episode ? mapEpisodeSummary(episode) : null,
      previousEpisode: previous ? mapEpisodeSummary(previous) : null,
    };
  }

  async buildProjectContext(projectId: string): Promise<StoryContext> {
    const [bible, world, characters, seasons] = await Promise.all([
      this.buildStoryBibleContext(projectId),
      this.buildWorldContext(projectId),
      this.buildCharacterContext(projectId),
      this.prisma.season.findMany({
        where: { projectId },
        orderBy: { number: "asc" },
      }),
    ]);
    const episodes = await this.prisma.episode.findMany({
      where: { projectId },
      orderBy: [{ number: "asc" }],
      select: {
        id: true,
        number: true,
        title: true,
        synopsis: true,
        outline: true,
        status: true,
        storyState: true,
      },
      take: 40,
    });
    return {
      storyBible: bible.storyBible,
      world: world.world,
      civilizations: world.civilizations,
      factions: world.factions,
      locations: world.locations,
      powerSystems: world.powerSystems,
      characters: characters.characters,
      relationships: characters.relationships,
      seasons: seasons.map((item) => mapSeason(item)),
      episodes: episodes.map(mapEpisodeSummary),
    };
  }

  async buildScriptContext(projectId: string, episodeId: string): Promise<StoryContext> {
    const [project, context] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, description: true, genre: true },
      }),
      this.buildEpisodeContext(projectId, episodeId),
    ]);
    return {
      ...context,
      project: project
        ? {
            name: project.name,
            description: project.description,
            genre: project.genre,
          }
        : null,
    };
  }

  async buildStoryboardContext(projectId: string, episodeId: string): Promise<StoryContext> {
    const context = await this.buildScriptContext(projectId, episodeId);
    const [script, characters] = await Promise.all([
      this.prisma.script.findUnique({
        where: { episodeId },
        include: {
          scenes: {
            orderBy: { number: "asc" },
            take: 20,
            include: {
              blocks: {
                orderBy: { order: "asc" },
                take: 40,
                include: {
                  character: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.character.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
        include: {
          civilization: { select: { name: true } },
          faction: { select: { name: true } },
        },
      }),
    ]);
    return {
      ...context,
      characters: characters.map((item) =>
        summarizeCharacterForStoryboard({
          id: item.id,
          name: item.name,
          role: item.role,
          identity: item.identity,
          personality: item.personality,
          goal: item.goal,
          conflict: item.conflict,
          appearance: item.appearance,
          appearanceProfile: item.appearanceProfile,
          imageProfile: item.imageProfile,
          abilities: item.ability,
          civilization: item.civilization?.name ?? null,
          faction: item.faction?.name ?? null,
        }),
      ),
      script: script && script.projectId === projectId ? mapScriptContext(script) : null,
    };
  }
}

function mapEpisodeSummary(row: {
  id: string;
  number: number;
  title: string;
  synopsis: string | null;
  outline: string | null;
  status: string;
  storyState: PrismaJson;
  continuityNotes?: string | null;
}): StoryEpisodeSummary {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    synopsis: row.synopsis,
    outline: row.outline,
    status: row.status as StoryEpisodeSummary["status"],
    storyState: asStoryState(row.storyState),
    continuityNotes: row.continuityNotes ?? null,
  };
}

function mapScriptContext(script: {
  id: string;
  version: number;
  status: string;
  title: string;
  scenes: Array<{
    id: string;
    number: number;
    title: string;
    location: string | null;
    timeOfDay: string | null;
    summary: string | null;
    blocks: Array<{
      id: string;
      order: number;
      type: string;
      content: string;
      characterId: string | null;
      character: { name: string } | null;
    }>;
  }>;
}): StoryboardScriptContext {
  return {
    id: script.id,
    version: script.version,
    status: script.status as ScriptStatus,
    title: script.title,
    scenes: script.scenes.map((scene) => ({
      id: scene.id,
      number: scene.number,
      title: scene.title,
      location: scene.location,
      timeOfDay: scene.timeOfDay,
      summary: scene.summary,
      blocks: scene.blocks.map((block) => ({
        id: block.id,
        order: block.order,
        type: block.type as StoryboardScriptContext["scenes"][number]["blocks"][number]["type"],
        characterId: block.characterId,
        characterName: block.character?.name ?? null,
        content: truncate(block.content, 280),
      })),
    })),
  };
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
}

type PrismaJson = Parameters<typeof asStoryState>[0];
