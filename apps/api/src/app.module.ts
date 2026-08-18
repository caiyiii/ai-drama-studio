import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { EpisodesModule } from "./modules/episodes/episodes.module";
import { CharactersModule } from "./modules/characters/characters.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { StoryboardModule } from "./modules/storyboard/storyboard.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { WorldModule } from "./modules/world/world.module";
import { GenerationModule } from "./modules/generation/generation.module";
import { AiModule } from "./modules/ai/ai.module";
import { StoryModule } from "./modules/story/story.module";
import { ScriptModule } from "./modules/script/script.module";
import { TimelineModule } from "./modules/timeline/timeline.module";
import { RenderModule } from "./modules/render/render.module";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
      load: [configuration],
    }),
    PrismaModule,
    ProjectsModule,
    EpisodesModule,
    CharactersModule,
    LocationsModule,
    StoryboardModule,
    AssetsModule,
    AiModule,
    GenerationModule,
    WorldModule,
    StoryModule,
    ScriptModule,
    TimelineModule,
    RenderModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
