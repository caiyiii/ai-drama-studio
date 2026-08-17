import { Module } from "@nestjs/common";
import { AssetStorageService } from "./asset-storage.service";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";

@Module({
  controllers: [AssetsController],
  providers: [AssetStorageService, AssetsService],
  exports: [AssetStorageService, AssetsService],
})
export class AssetsModule {}
