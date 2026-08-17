import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { AiProvidersService } from "./ai-providers.service";
import { SetProjectAiProviderDto } from "./dto/set-project-ai-provider.dto";

@Controller("projects/:projectId/ai-provider")
export class ProjectAiProviderController {
  constructor(private readonly providers: AiProvidersService) {}

  @Get()
  getOne(@Param("projectId") projectId: string) {
    return this.providers.getProjectProvider(projectId);
  }

  @Patch()
  update(
    @Param("projectId") projectId: string,
    @Body() dto: SetProjectAiProviderDto,
  ) {
    return this.providers.setProjectProvider(projectId, dto.aiProviderId ?? null);
  }
}
