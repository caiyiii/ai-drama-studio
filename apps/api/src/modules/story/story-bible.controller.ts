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
import { StoryBibleService } from "./story-bible.service";
import {
  CreateStoryBibleDto,
  UpdateStoryBibleDto,
} from "./dto/story-bible.dto";

@Controller("projects/:projectId/story-bible")
export class StoryBibleController {
  constructor(private readonly storyBible: StoryBibleService) {}

  @Get()
  get(@Param("projectId") projectId: string) {
    return this.storyBible.get(projectId);
  }

  @Post()
  create(
    @Param("projectId") projectId: string,
    @Body() dto: CreateStoryBibleDto,
  ) {
    return this.storyBible.create(projectId, dto);
  }

  @Patch()
  update(
    @Param("projectId") projectId: string,
    @Body() dto: UpdateStoryBibleDto,
  ) {
    return this.storyBible.update(projectId, dto);
  }

  @Delete()
  @HttpCode(204)
  remove(@Param("projectId") projectId: string) {
    return this.storyBible.remove(projectId);
  }
}
