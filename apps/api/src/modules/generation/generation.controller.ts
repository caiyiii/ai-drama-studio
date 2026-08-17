import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { WorldGenerationService } from "./world-generation.service";
import { CreateWorldGenerationDto } from "./dto/create-world-generation.dto";

@Controller("projects/:projectId/generations")
export class GenerationController {
  constructor(private readonly worldGeneration: WorldGenerationService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.worldGeneration.list(projectId);
  }

  @Get(":id")
  getOne(@Param("projectId") projectId: string, @Param("id") id: string) {
    return this.worldGeneration.getOne(projectId, id);
  }

  @Post("world")
  createWorld(
    @Param("projectId") projectId: string,
    @Body() dto: CreateWorldGenerationDto,
  ) {
    return this.worldGeneration.createWorldGeneration(projectId, dto);
  }

  @Post(":id/apply")
  apply(@Param("projectId") projectId: string, @Param("id") id: string) {
    return this.worldGeneration.apply(projectId, id);
  }
}
