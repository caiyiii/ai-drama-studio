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
import { CreateStoryboardDto, UpdateStoryboardDto } from "./dto/storyboard.dto";
import { StoryboardsService } from "./storyboards.service";

@Controller("projects/:projectId/episodes/:episodeId/storyboard")
export class StoryboardsController {
  constructor(private readonly storyboards: StoryboardsService) {}

  @Get()
  get(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.storyboards.get(projectId, episodeId);
  }

  @Post()
  create(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: CreateStoryboardDto,
  ) {
    return this.storyboards.create(projectId, episodeId, dto);
  }

  @Patch()
  update(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
    @Body() dto: UpdateStoryboardDto,
  ) {
    return this.storyboards.update(projectId, episodeId, dto);
  }

  @Delete()
  @HttpCode(204)
  remove(
    @Param("projectId") projectId: string,
    @Param("episodeId") episodeId: string,
  ) {
    return this.storyboards.remove(projectId, episodeId);
  }
}
