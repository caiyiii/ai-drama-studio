import { Body, Controller, Delete, Get, Param, Patch } from "@nestjs/common";
import { ProjectAiConfigService } from "./project-ai-config.service";
import { SetProjectAiConfigDto } from "./dto/set-project-ai-config.dto";

@Controller("projects/:projectId/ai-config")
export class ProjectAiConfigController {
  constructor(private readonly configs: ProjectAiConfigService) {}

  @Get()
  getAll(@Param("projectId") projectId: string) {
    return this.configs.getProjectConfig(projectId);
  }

  @Patch(":capability")
  update(
    @Param("projectId") projectId: string,
    @Param("capability") capability: string,
    @Body() dto: SetProjectAiConfigDto,
  ) {
    return this.configs.setProjectConfig(projectId, capability, dto);
  }

  @Delete(":capability")
  remove(
    @Param("projectId") projectId: string,
    @Param("capability") capability: string,
  ) {
    return this.configs.deleteProjectConfig(projectId, capability);
  }
}
