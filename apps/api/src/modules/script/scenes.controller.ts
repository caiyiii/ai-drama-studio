import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CreateSceneDto, ReorderScenesDto, UpdateSceneDto } from "./dto/scene.dto";
import { ScenesService } from "./scenes.service";

@Controller("projects/:projectId/episodes/:episodeId/script/scenes")
export class ScenesController {
  constructor(private readonly scenes: ScenesService) {}

  @Get()
  list(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.scenes.list(projectId, episodeId);
  }

  @Post()
  create(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: CreateSceneDto,
  ) {
    return this.scenes.create(projectId, episodeId, dto);
  }

  @Post("reorder")
  reorder(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: ReorderScenesDto,
  ) {
    return this.scenes.reorder(projectId, episodeId, dto);
  }

  @Get(":sceneId")
  get(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("sceneId") sceneId: string,
  ) {
    return this.scenes.get(projectId, episodeId, sceneId);
  }

  @Patch(":sceneId")
  update(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("sceneId") sceneId: string,
    @Body() dto: UpdateSceneDto,
  ) {
    return this.scenes.update(projectId, episodeId, sceneId, dto);
  }

  @Delete(":sceneId")
  @HttpCode(204)
  remove(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("sceneId") sceneId: string,
  ) {
    return this.scenes.remove(projectId, episodeId, sceneId);
  }
}
