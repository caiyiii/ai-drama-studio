import { Global, Module } from "@nestjs/common";
import { AiCapabilitiesController } from "./ai-capabilities.controller";
import { AiProvidersController } from "./ai-providers.controller";
import { AiProvidersService } from "./ai-providers.service";
import { AiService } from "./ai.service";
import { CryptoService } from "./crypto/crypto.service";
import { ProjectAiConfigController } from "./project-ai-config.controller";
import { ProjectAiConfigService } from "./project-ai-config.service";
import { ProjectAiProviderController } from "./project-ai-provider.controller";
import { ProviderResolver } from "./provider-resolver";

@Global()
@Module({
  controllers: [
    AiCapabilitiesController,
    AiProvidersController,
    ProjectAiProviderController,
    ProjectAiConfigController,
  ],
  providers: [
    CryptoService,
    ProviderResolver,
    AiService,
    AiProvidersService,
    ProjectAiConfigService,
  ],
  exports: [AiService, ProviderResolver, CryptoService, ProjectAiConfigService],
})
export class AiModule {}
