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
import { CreateScriptDto, UpdateScriptDto } from "./dto/script.dto";
import { ScriptsService } from "./scripts.service";

@Controller("projects/:projectId/episodes/:episodeId/script")
export class ScriptsController {
  constructor(private readonly scripts: ScriptsService) {}

  @Get()
  get(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.scripts.get(projectId, episodeId);
  }

  @Post()
  create(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: CreateScriptDto,
  ) {
    return this.scripts.create(projectId, episodeId, dto);
  }

  @Patch()
  update(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: UpdateScriptDto,
  ) {
    return this.scripts.update(projectId, episodeId, dto);
  }

  @Delete()
  @HttpCode(204)
  remove(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.scripts.remove(projectId, episodeId);
  }
}
