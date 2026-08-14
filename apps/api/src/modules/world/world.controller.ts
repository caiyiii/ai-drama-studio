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
import { WorldService } from "./world.service";
import { CreateWorldDto } from "./dto/create-world.dto";
import { UpdateWorldDto } from "./dto/update-world.dto";
import { CreateCivilizationDto } from "./dto/create-civilization.dto";
import { UpdateCivilizationDto } from "./dto/update-civilization.dto";
import { CreateWorldHistoryDto } from "./dto/create-world-history.dto";
import { UpdateWorldHistoryDto } from "./dto/update-world-history.dto";
import { CreateFactionDto } from "./dto/create-faction.dto";
import { UpdateFactionDto } from "./dto/update-faction.dto";
import { CreateWorldLocationDto } from "./dto/create-world-location.dto";
import { UpdateWorldLocationDto } from "./dto/update-world-location.dto";
import { CreatePowerSystemDto } from "./dto/create-power-system.dto";
import { UpdatePowerSystemDto } from "./dto/update-power-system.dto";

@Controller("projects/:projectId/world")
export class WorldController {
  constructor(private readonly worldService: WorldService) {}

  @Get()
  getWorld(@Param("projectId") projectId: string) {
    return this.worldService.getWorld(projectId);
  }

  @Post()
  createWorld(
    @Param("projectId") projectId: string,
    @Body() dto: CreateWorldDto,
  ) {
    return this.worldService.createWorld(projectId, dto);
  }

  @Patch()
  updateWorld(
    @Param("projectId") projectId: string,
    @Body() dto: UpdateWorldDto,
  ) {
    return this.worldService.updateWorld(projectId, dto);
  }

  @Delete()
  @HttpCode(204)
  deleteWorld(@Param("projectId") projectId: string) {
    return this.worldService.deleteWorld(projectId);
  }

  @Get("civilizations")
  listCivilizations(@Param("projectId") projectId: string) {
    return this.worldService.listCivilizations(projectId);
  }

  @Post("civilizations")
  createCivilization(
    @Param("projectId") projectId: string,
    @Body() dto: CreateCivilizationDto,
  ) {
    return this.worldService.createCivilization(projectId, dto);
  }

  @Patch("civilizations/:id")
  updateCivilization(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCivilizationDto,
  ) {
    return this.worldService.updateCivilization(projectId, id, dto);
  }

  @Delete("civilizations/:id")
  @HttpCode(204)
  deleteCivilization(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
  ) {
    return this.worldService.deleteCivilization(projectId, id);
  }

  @Get("history")
  listHistory(@Param("projectId") projectId: string) {
    return this.worldService.listHistory(projectId);
  }

  @Post("history")
  createHistory(
    @Param("projectId") projectId: string,
    @Body() dto: CreateWorldHistoryDto,
  ) {
    return this.worldService.createHistory(projectId, dto);
  }

  @Patch("history/:id")
  updateHistory(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() dto: UpdateWorldHistoryDto,
  ) {
    return this.worldService.updateHistory(projectId, id, dto);
  }

  @Delete("history/:id")
  @HttpCode(204)
  deleteHistory(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
  ) {
    return this.worldService.deleteHistory(projectId, id);
  }

  @Get("factions")
  listFactions(@Param("projectId") projectId: string) {
    return this.worldService.listFactions(projectId);
  }

  @Post("factions")
  createFaction(
    @Param("projectId") projectId: string,
    @Body() dto: CreateFactionDto,
  ) {
    return this.worldService.createFaction(projectId, dto);
  }

  @Patch("factions/:id")
  updateFaction(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() dto: UpdateFactionDto,
  ) {
    return this.worldService.updateFaction(projectId, id, dto);
  }

  @Delete("factions/:id")
  @HttpCode(204)
  deleteFaction(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
  ) {
    return this.worldService.deleteFaction(projectId, id);
  }

  @Get("locations")
  listLocations(@Param("projectId") projectId: string) {
    return this.worldService.listLocations(projectId);
  }

  @Post("locations")
  createLocation(
    @Param("projectId") projectId: string,
    @Body() dto: CreateWorldLocationDto,
  ) {
    return this.worldService.createLocation(projectId, dto);
  }

  @Patch("locations/:id")
  updateLocation(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() dto: UpdateWorldLocationDto,
  ) {
    return this.worldService.updateLocation(projectId, id, dto);
  }

  @Delete("locations/:id")
  @HttpCode(204)
  deleteLocation(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
  ) {
    return this.worldService.deleteLocation(projectId, id);
  }

  @Get("power-systems")
  listPowerSystems(@Param("projectId") projectId: string) {
    return this.worldService.listPowerSystems(projectId);
  }

  @Post("power-systems")
  createPowerSystem(
    @Param("projectId") projectId: string,
    @Body() dto: CreatePowerSystemDto,
  ) {
    return this.worldService.createPowerSystem(projectId, dto);
  }

  @Patch("power-systems/:id")
  updatePowerSystem(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() dto: UpdatePowerSystemDto,
  ) {
    return this.worldService.updatePowerSystem(projectId, id, dto);
  }

  @Delete("power-systems/:id")
  @HttpCode(204)
  deletePowerSystem(
    @Param("projectId") projectId: string,
    @Param("id") id: string,
  ) {
    return this.worldService.deletePowerSystem(projectId, id);
  }
}
