import { Controller, Get, Param } from "@nestjs/common";
import { EpisodesService } from "./episodes.service";

@Controller("projects/:projectId/episodes")
export class ProjectEpisodesController {
  constructor(private readonly episodes: EpisodesService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.episodes.list(projectId);
  }

  @Get(":episodeId/overview")
  overview(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.episodes.getOverviewByEpisode(projectId, episodeId);
  }
}
