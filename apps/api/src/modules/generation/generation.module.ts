import { Module } from "@nestjs/common";
import { GenerationController } from "./generation.controller";
import { GenerationExecutor } from "./generation.executor";
import { WorldGenerationService } from "./world-generation.service";

@Module({
  controllers: [GenerationController],
  providers: [GenerationExecutor, WorldGenerationService],
})
export class GenerationModule {}
