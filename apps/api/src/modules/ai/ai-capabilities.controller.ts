import { Controller, Get } from "@nestjs/common";
import { ProjectAiConfigService } from "./project-ai-config.service";

@Controller("ai/capabilities")
export class AiCapabilitiesController {
  constructor(private readonly configs: ProjectAiConfigService) {}

  @Get()
  list() {
    return this.configs.listCapabilities();
  }
}
