import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { GenerationTaskType } from "@prisma/client";
import { CharacterGenerationService } from "./character-generation.service";
import { CreateCharacterGenerationDto } from "./dto/create-character-generation.dto";
import {
  CreateEpisodeOutlineGenerationDto,
  CreateSeasonOutlineGenerationDto,
  CreateStoryBibleGenerationDto,
} from "./dto/create-story-generation.dto";
import { CreateWorldGenerationDto } from "./dto/create-world-generation.dto";
import { CreateScriptGenerationDto } from "./dto/create-script-generation.dto";
import { CreateStoryboardGenerationDto } from "./dto/create-storyboard-generation.dto";
import { ScriptGenerationService } from "./script-generation.service";
import { StoryboardGenerationService } from "./storyboard-generation.service";
import { StoryGenerationService } from "./story-generation.service";
import { WorldGenerationService } from "./world-generation.service";

@Controller("projects/:projectId/generations")
export class GenerationController {
  constructor(
    private readonly worldGeneration: WorldGenerationService,
    private readonly characterGeneration: CharacterGenerationService,
    private readonly storyGeneration: StoryGenerationService,
    private readonly scriptGeneration: ScriptGenerationService,
    private readonly storyboardGeneration: StoryboardGenerationService,
  ) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.worldGeneration.list(projectId);
  }

  @Post("world")
  createWorld(
    @Param("projectId") projectId: string,
    @Body() dto: CreateWorldGenerationDto,
  ) {
    return this.worldGeneration.createWorldGeneration(projectId, dto);
  }

  @Post("character")
  createCharacter(
    @Param("projectId") projectId: string,
    @Body() dto: CreateCharacterGenerationDto,
  ) {
    return this.characterGeneration.createCharacterGeneration(projectId, dto);
  }

  @Post("story-bible")
  createStoryBible(
    @Param("projectId") projectId: string,
    @Body() dto: CreateStoryBibleGenerationDto,
  ) {
    return this.storyGeneration.createStoryBibleGeneration(projectId, dto);
  }

  @Post("season-outline")
  createSeasonOutline(
    @Param("projectId") projectId: string,
    @Body() dto: CreateSeasonOutlineGenerationDto,
  ) {
    return this.storyGeneration.createSeasonOutlineGeneration(projectId, dto);
  }

  @Post("episode")
  createEpisodeOutline(
    @Param("projectId") projectId: string,
    @Body() dto: CreateEpisodeOutlineGenerationDto,
  ) {
    return this.storyGeneration.createEpisodeOutlineGeneration(projectId, dto);
  }

  @Post("script")
  createScript(
    @Param("projectId") projectId: string,
    @Body() dto: CreateScriptGenerationDto,
  ) {
    return this.scriptGeneration.createScriptGeneration(projectId, dto);
  }

  @Post("storyboard")
  createStoryboard(
    @Param("projectId") projectId: string,
    @Body() dto: CreateStoryboardGenerationDto,
  ) {
    return this.storyboardGeneration.createStoryboardGeneration(projectId, dto);
  }

  @Get(":id")
  getOne(@Param("projectId") projectId: string, @Param("id") id: string) {
    return this.worldGeneration.getOne(projectId, id);
  }

  @Post(":id/apply")
  async apply(@Param("projectId") projectId: string, @Param("id") id: string) {
    const task = await this.worldGeneration.getOne(projectId, id);
    if (task.type === GenerationTaskType.CHARACTER) {
      return this.characterGeneration.apply(projectId, id);
    }
    if (
      task.type === GenerationTaskType.STORY_BIBLE ||
      task.type === GenerationTaskType.SEASON_OUTLINE ||
      task.type === GenerationTaskType.EPISODE_OUTLINE
    ) {
      return this.storyGeneration.apply(projectId, id);
    }
    if (task.type === GenerationTaskType.SCRIPT) {
      return this.scriptGeneration.apply(projectId, id);
    }
    if (task.type === GenerationTaskType.STORYBOARD) {
      return this.storyboardGeneration.apply(projectId, id);
    }
    return this.worldGeneration.apply(projectId, id);
  }
}
