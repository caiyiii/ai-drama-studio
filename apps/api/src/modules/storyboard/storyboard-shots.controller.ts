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
import {
  CreateStoryboardShotDto,
  ReorderStoryboardShotsDto,
  UpdateStoryboardShotDto,
} from "./dto/storyboard-shot.dto";
import { StoryboardShotsService } from "./storyboard-shots.service";

@Controller("projects/:projectId/episodes/:episodeId/storyboard/shots")
export class StoryboardShotsController {
  constructor(private readonly shots: StoryboardShotsService) {}

  @Get()
  list(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.shots.list(
      projectId,
      episodeId,
      Number(page) || 1,
      Number(pageSize) || 100,
    );
  }

  @Post()
  create(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: CreateStoryboardShotDto,
  ) {
    return this.shots.create(projectId, episodeId, dto);
  }

  @Post("reorder")
  reorder(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: ReorderStoryboardShotsDto,
  ) {
    return this.shots.reorder(projectId, episodeId, dto);
  }

  @Get(":shotId")
  get(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("shotId") shotId: string,
  ) {
    return this.shots.get(projectId, episodeId, shotId);
  }

  @Patch(":shotId")
  update(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("shotId") shotId: string,
    @Body() dto: UpdateStoryboardShotDto,
  ) {
    return this.shots.update(projectId, episodeId, shotId, dto);
  }

  @Delete(":shotId")
  @HttpCode(204)
  remove(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Param("shotId") shotId: string,
  ) {
    return this.shots.remove(projectId, episodeId, shotId);
  }
}
