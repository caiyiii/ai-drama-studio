import { Module } from "@nestjs/common";
import { StoryboardShotsController } from "./storyboard-shots.controller";
import { StoryboardShotsService } from "./storyboard-shots.service";
import { StoryboardsController } from "./storyboards.controller";
import { StoryboardsService } from "./storyboards.service";

@Module({
  controllers: [StoryboardsController, StoryboardShotsController],
  providers: [StoryboardsService, StoryboardShotsService],
  exports: [StoryboardsService, StoryboardShotsService],
})
export class StoryboardModule {}
