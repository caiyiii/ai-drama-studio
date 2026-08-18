import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { CreateTimelineClipDto, UpdateTimelineClipDto } from "./dto/clip.dto";
import { CreateTimelineTrackDto, UpdateTimelineTrackDto } from "./dto/track.dto";
import { TimelineService } from "./timeline.service";

@Controller("projects/:projectId/timelines/:timelineId")
export class TimelineItemsController {
  constructor(private readonly timelines: TimelineService) {}

  @Get("tracks")
  listTracks(
    @Param("projectId") projectId: string,
    @Param("timelineId") timelineId: string,
  ) {
    return this.timelines.listTracks(projectId, timelineId);
  }

  @Post("tracks")
  createTrack(
    @Param("projectId") projectId: string,
    @Param("timelineId") timelineId: string,
    @Body() dto: CreateTimelineTrackDto,
  ) {
    return this.timelines.createTrack(projectId, timelineId, dto);
  }

  @Patch("tracks/:trackId")
  updateTrack(
    @Param("projectId") projectId: string,
    @Param("timelineId") timelineId: string,
    @Param("trackId") trackId: string,
    @Body() dto: UpdateTimelineTrackDto,
  ) {
    return this.timelines.updateTrack(projectId, timelineId, trackId, dto);
  }

  @Delete("tracks/:trackId")
  @HttpCode(204)
  removeTrack(
    @Param("projectId") projectId: string,
    @Param("timelineId") timelineId: string,
    @Param("trackId") trackId: string,
  ) {
    return this.timelines.removeTrack(projectId, timelineId, trackId);
  }

  @Get("clips")
  listClips(
    @Param("projectId") projectId: string,
    @Param("timelineId") timelineId: string,
  ) {
    return this.timelines.listClips(projectId, timelineId);
  }

  @Post("clips")
  createClip(
    @Param("projectId") projectId: string,
    @Param("timelineId") timelineId: string,
    @Body() dto: CreateTimelineClipDto,
  ) {
    return this.timelines.createClip(projectId, timelineId, dto);
  }

  @Patch("clips/:clipId")
  updateClip(
    @Param("projectId") projectId: string,
    @Param("timelineId") timelineId: string,
    @Param("clipId") clipId: string,
    @Body() dto: UpdateTimelineClipDto,
  ) {
    return this.timelines.updateClip(projectId, timelineId, clipId, dto);
  }

  @Delete("clips/:clipId")
  @HttpCode(204)
  removeClip(
    @Param("projectId") projectId: string,
    @Param("timelineId") timelineId: string,
    @Param("clipId") clipId: string,
  ) {
    return this.timelines.removeClip(projectId, timelineId, clipId);
  }
}
