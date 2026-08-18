import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { BuildTimelineDto } from "./dto/build-timeline.dto";
import { UpdateTimelineDto } from "./dto/update-timeline.dto";
import { CompositionService } from "./composition.service";
import { TimelineBuilderService } from "./timeline-builder.service";
import { TimelineContinuityService } from "./timeline-continuity.service";
import { TimelineService } from "./timeline.service";

@Controller("projects/:projectId/episodes/:episodeId/timeline")
export class TimelineController {
  constructor(
    private readonly timelines: TimelineService,
    private readonly builder: TimelineBuilderService,
    private readonly composition: CompositionService,
    private readonly continuity: TimelineContinuityService,
  ) {}

  @Get()
  get(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.timelines.get(projectId, episodeId);
  }

  @Post("build")
  build(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: BuildTimelineDto = {},
    @Query("rebuild") rebuildQuery?: string,
  ) {
    const rebuild = dto.rebuild === true || rebuildQuery === "true";
    return this.builder.build(projectId, episodeId, rebuild);
  }

  @Patch()
  update(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: UpdateTimelineDto,
  ) {
    return this.timelines.update(projectId, episodeId, dto);
  }

  @Delete()
  @HttpCode(204)
  remove(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.timelines.remove(projectId, episodeId);
  }

  @Get("manifest")
  manifest(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.composition.compose(projectId, episodeId);
  }

  @Get("preview")
  preview(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.composition.preview(projectId, episodeId);
  }

  @Post("unlock")
  unlock(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.timelines.unlock(projectId, episodeId);
  }

  @Get("continuity")
  continuityCheck(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.continuity.validateTimelineContinuity(projectId, episodeId);
  }
}
