import { Module } from "@nestjs/common";
import { StoryModule } from "../story/story.module";
import { CharacterGenerationService } from "./character-generation.service";
import { GenerationController } from "./generation.controller";
import { GenerationExecutor } from "./generation.executor";
import { StoryGenerationService } from "./story-generation.service";
import { WorldGenerationService } from "./world-generation.service";

@Module({
  imports: [StoryModule],
  controllers: [GenerationController],
  providers: [
    GenerationExecutor,
    WorldGenerationService,
    CharacterGenerationService,
    StoryGenerationService,
  ],
})
export class GenerationModule {}
