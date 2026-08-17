import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { AiProvidersService } from "./ai-providers.service";
import { CreateAiProviderDto } from "./dto/create-ai-provider.dto";
import { TestAiProviderDto } from "./dto/test-ai-provider.dto";
import { UpdateAiProviderDto } from "./dto/update-ai-provider.dto";

@Controller("ai/providers")
export class AiProvidersController {
  constructor(private readonly providers: AiProvidersService) {}

  @Get()
  list() {
    return this.providers.list();
  }

  @Post("test")
  testDraft(@Body() dto: TestAiProviderDto) {
    return this.providers.testDraft(dto);
  }

  @Post()
  create(@Body() dto: CreateAiProviderDto) {
    return this.providers.create(dto);
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.providers.getOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateAiProviderDto) {
    return this.providers.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.providers.remove(id);
  }

  @Post(":id/test")
  testSaved(@Param("id") id: string) {
    return this.providers.testSaved(id);
  }
}
