import { Module } from "@nestjs/common";
import { AssetsModule } from "../assets/assets.module";
import { TimelineModule } from "../timeline/timeline.module";
import { FFmpegService } from "./ffmpeg.service";
import { LocalFfmpegRenderEngine } from "./local-ffmpeg-render.engine";
import { RenderArtifactService } from "./render-artifact.service";
import { RenderController } from "./render.controller";
import { RenderManifestService } from "./render-manifest.service";
import { RenderProgressService } from "./render-progress.service";
import { RenderService } from "./render.service";
import { RenderWorkerService } from "./render-worker.service";

@Module({
  imports: [AssetsModule, TimelineModule],
  controllers: [RenderController],
  providers: [
    FFmpegService,
    LocalFfmpegRenderEngine,
    RenderManifestService,
    RenderProgressService,
    RenderArtifactService,
    RenderService,
    RenderWorkerService,
  ],
  exports: [RenderService, RenderWorkerService, FFmpegService],
})
export class RenderModule {}
