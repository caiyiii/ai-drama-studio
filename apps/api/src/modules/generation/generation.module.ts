import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module";
import { StoryModule } from "../story/story.module";
import { CharacterGenerationService } from "./character-generation.service";
import { GenerationController } from "./generation.controller";
import { GenerationExecutor } from "./generation.executor";
import { ImageGenerationService } from "./image-generation.service";
import { VideoGenerationService } from "./video-generation.service";
import { ScriptGenerationService } from "./script-generation.service";
import { StoryboardGenerationService } from "./storyboard-generation.service";
import { StoryGenerationService } from "./story-generation.service";
import { WorldGenerationService } from "./world-generation.service";

@Module({
  imports: [StoryModule, AssetsModule],
  controllers: [GenerationController],
  providers: [
    GenerationExecutor,
    WorldGenerationService,
    CharacterGenerationService,
    StoryGenerationService,
    ScriptGenerationService,
    StoryboardGenerationService,
    ImageGenerationService,
    VideoGenerationService,
  ],
})
export class GenerationModule {}
