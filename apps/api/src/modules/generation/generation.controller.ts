import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { GenerationTaskType } from "@prisma/client";
import { CharacterGenerationService } from "./character-generation.service";
import { CreateCharacterGenerationDto } from "./dto/create-character-generation.dto";
import { CreateWorldGenerationDto } from "./dto/create-world-generation.dto";
import { WorldGenerationService } from "./world-generation.service";

@Controller("projects/:projectId/generations")
export class GenerationController {
  constructor(
    private readonly worldGeneration: WorldGenerationService,
    private readonly characterGeneration: CharacterGenerationService,
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
    return this.worldGeneration.apply(projectId, id);
  }
}
