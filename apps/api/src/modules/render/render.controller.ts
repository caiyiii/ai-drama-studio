import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { RenderArtifactService } from "./render-artifact.service";
import { RenderService } from "./render.service";

@Controller("projects/:projectId")
export class RenderController {
  constructor(
    private readonly renders: RenderService,
    private readonly artifacts: RenderArtifactService,
  ) {}

  @Post("episodes/:episodeId/render")
  create(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.renders.create(projectId, episodeId);
  }

  @Get("render-jobs")
  list(
    @Param("projectId") projectId: string,
    @Query("episodeId") episodeId?: string,
  ) {
    return this.renders.list(projectId, episodeId);
  }

  @Get("render-jobs/:renderJobId")
  get(
    @Param("projectId") projectId: string,
    @Param("renderJobId") renderJobId: string,
  ) {
    return this.renders.get(projectId, renderJobId);
  }

  @Post("render-jobs/:renderJobId/cancel")
  cancel(
    @Param("projectId") projectId: string,
    @Param("renderJobId") renderJobId: string,
  ) {
    return this.renders.cancel(projectId, renderJobId);
  }

  @Post("render-jobs/:renderJobId/retry")
  retry(
    @Param("projectId") projectId: string,
    @Param("renderJobId") renderJobId: string,
  ) {
    return this.renders.retry(projectId, renderJobId);
  }

  @Get("render-jobs/:renderJobId/artifact")
  artifact(
    @Param("projectId") projectId: string,
    @Param("renderJobId") renderJobId: string,
  ) {
    return this.renders.getArtifact(projectId, renderJobId);
  }

  @Get("render-artifacts/:artifactId")
  getArtifact(
    @Param("projectId") projectId: string,
    @Param("artifactId") artifactId: string,
  ) {
    return this.artifacts.get(projectId, artifactId);
  }

  @Get("render-artifacts/:artifactId/file")
  getFile(
    @Param("projectId") projectId: string,
    @Param("artifactId") artifactId: string,
  ) {
    return this.artifacts.getFile(projectId, artifactId);
  }
}
