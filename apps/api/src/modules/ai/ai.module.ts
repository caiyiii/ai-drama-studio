import { Global, Module } from "@nestjs/common";
import { AiProvidersController } from "./ai-providers.controller";
import { AiProvidersService } from "./ai-providers.service";
import { AiService } from "./ai.service";
import { CryptoService } from "./crypto/crypto.service";
import { ProjectAiProviderController } from "./project-ai-provider.controller";
import { ProviderResolver } from "./provider-resolver";

@Global()
@Module({
  controllers: [AiProvidersController, ProjectAiProviderController],
  providers: [CryptoService, ProviderResolver, AiService, AiProvidersService],
  exports: [AiService, ProviderResolver, CryptoService],
})
export class AiModule {}
