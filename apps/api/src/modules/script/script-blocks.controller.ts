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
import {
  CreateScriptBlockDto,
  ReorderScriptBlocksDto,
  UpdateScriptBlockDto,
} from "./dto/script-block.dto";
import { ScriptBlocksService } from "./script-blocks.service";

@Controller("projects/:projectId/episodes/:episodeId/script/scenes/:sceneId/blocks")
export class ScriptBlocksController {
  constructor(private readonly blocks: ScriptBlocksService) {}

  @Get()
  list(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("sceneId") sceneId: string,
  ) {
    return this.blocks.list(projectId, episodeId, sceneId);
  }

  @Post()
  create(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("sceneId") sceneId: string,
    @Body() dto: CreateScriptBlockDto,
  ) {
    return this.blocks.create(projectId, episodeId, sceneId, dto);
  }

  @Post("reorder")
  reorder(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("sceneId") sceneId: string,
    @Body() dto: ReorderScriptBlocksDto,
  ) {
    return this.blocks.reorder(projectId, episodeId, sceneId, dto);
  }

  @Get(":blockId")
  get(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("sceneId") sceneId: string,
    @Param("blockId") blockId: string,
  ) {
    return this.blocks.get(projectId, episodeId, sceneId, blockId);
  }

  @Patch(":blockId")
  update(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("sceneId") sceneId: string,
    @Param("blockId") blockId: string,
    @Body() dto: UpdateScriptBlockDto,
  ) {
    return this.blocks.update(projectId, episodeId, sceneId, blockId, dto);
  }

  @Delete(":blockId")
  @HttpCode(204)
  remove(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("sceneId") sceneId: string,
    @Param("blockId") blockId: string,
  ) {
    return this.blocks.remove(projectId, episodeId, sceneId, blockId);
  }
}
