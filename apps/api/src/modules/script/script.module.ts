import { Module } from "@nestjs/common";
import { ScriptBlocksController } from "./script-blocks.controller";
import { ScriptBlocksService } from "./script-blocks.service";
import { ScenesController } from "./scenes.controller";
import { ScenesService } from "./scenes.service";
import { ScriptsController } from "./scripts.controller";
import { ScriptsService } from "./scripts.service";

@Module({
  controllers: [ScriptsController, ScenesController, ScriptBlocksController],
  providers: [ScriptsService, ScenesService, ScriptBlocksService],
  exports: [ScriptsService, ScenesService, ScriptBlocksService],
})
export class ScriptModule {}
