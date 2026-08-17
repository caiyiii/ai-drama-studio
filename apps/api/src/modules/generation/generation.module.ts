import { Module } from "@nestjs/common";
import { StoryModule } from "../story/story.module";
import { CharacterGenerationService } from "./character-generation.service";
import { GenerationController } from "./generation.controller";
import { GenerationExecutor } from "./generation.executor";
import { ScriptGenerationService } from "./script-generation.service";
import { StoryboardGenerationService } from "./storyboard-generation.service";
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
    ScriptGenerationService,
    StoryboardGenerationService,
  ],
})
export class GenerationModule {}
