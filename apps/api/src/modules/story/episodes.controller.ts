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
  CreateEpisodeDto,
  ReorderEpisodesDto,
  UpdateEpisodeDto,
} from "./dto/episode.dto";
import { EpisodesService } from "./episodes.service";

@Controller("projects/:projectId/seasons/:seasonId/episodes")
export class EpisodesController {
  constructor(private readonly episodes: EpisodesService) {}

  @Get()
  list(
    @Param("projectId") projectId: string,
    @Param("seasonId") seasonId: string,
  ) {
    return this.episodes.list(projectId, seasonId);
  }

  @Post()
  create(
    @Param("projectId") projectId: string,
    @Param("seasonId") seasonId: string,
    @Body() dto: CreateEpisodeDto,
  ) {
    return this.episodes.create(projectId, seasonId, dto);
  }

  @Post("reorder")
  reorder(
    @Param("projectId") projectId: string,
    @Param("seasonId") seasonId: string,
    @Body() dto: ReorderEpisodesDto,
  ) {
    return this.episodes.reorder(projectId, seasonId, dto);
  }

  @Get(":episodeId")
  get(
    @Param("projectId") projectId: string,
    @Param("seasonId") seasonId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.episodes.get(projectId, seasonId, episodeId);
  }

  @Patch(":episodeId")
  update(
    @Param("projectId") projectId: string,
    @Param("seasonId") seasonId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: UpdateEpisodeDto,
  ) {
    return this.episodes.update(projectId, seasonId, episodeId, dto);
  }

  @Delete(":episodeId")
  @HttpCode(204)
  remove(
    @Param("projectId") projectId: string,
    @Param("seasonId") seasonId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.episodes.remove(projectId, seasonId, episodeId);
  }
}
