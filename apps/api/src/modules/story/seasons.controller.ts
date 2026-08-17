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
import { CreateSeasonDto, UpdateSeasonDto } from "./dto/season.dto";
import { SeasonsService } from "./seasons.service";

@Controller("projects/:projectId/seasons")
export class SeasonsController {
  constructor(private readonly seasons: SeasonsService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.seasons.list(projectId);
  }

  @Post()
  create(@Param("projectId") projectId: string, @Body() dto: CreateSeasonDto) {
    return this.seasons.create(projectId, dto);
  }

  @Get(":seasonId")
  get(
    @Param("projectId") projectId: string,
    @Param("seasonId") seasonId: string,
  ) {
    return this.seasons.get(projectId, seasonId);
  }

  @Patch(":seasonId")
  update(
    @Param("projectId") projectId: string,
    @Param("seasonId") seasonId: string,
    @Body() dto: UpdateSeasonDto,
  ) {
    return this.seasons.update(projectId, seasonId, dto);
  }

  @Delete(":seasonId")
  @HttpCode(204)
  remove(
    @Param("projectId") projectId: string,
    @Param("seasonId") seasonId: string,
  ) {
    return this.seasons.remove(projectId, seasonId);
  }
}
