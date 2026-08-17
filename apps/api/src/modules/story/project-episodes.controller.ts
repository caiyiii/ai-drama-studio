import { Controller, Get, Param } from "@nestjs/common";
import { EpisodesService } from "./episodes.service";

@Controller("projects/:projectId/episodes")
export class ProjectEpisodesController {
  constructor(private readonly episodes: EpisodesService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.episodes.list(projectId);
  }
}
