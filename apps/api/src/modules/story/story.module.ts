import { Module } from "@nestjs/common";
import { EpisodesController } from "./episodes.controller";
import { EpisodesService } from "./episodes.service";
import { ProjectEpisodesController } from "./project-episodes.controller";
import { SeasonsController } from "./seasons.controller";
import { SeasonsService } from "./seasons.service";
import { StoryBibleController } from "./story-bible.controller";
import { StoryBibleService } from "./story-bible.service";
import { StoryContextBuilder } from "./story-context.builder";
import { StoryContinuityService } from "./story-continuity.service";

@Module({
  controllers: [
    StoryBibleController,
    SeasonsController,
    EpisodesController,
    ProjectEpisodesController,
  ],
  providers: [
    StoryBibleService,
    SeasonsService,
    EpisodesService,
    StoryContextBuilder,
    StoryContinuityService,
  ],
  exports: [
    StoryBibleService,
    SeasonsService,
    EpisodesService,
    StoryContextBuilder,
    StoryContinuityService,
  ],
})
export class StoryModule {}
