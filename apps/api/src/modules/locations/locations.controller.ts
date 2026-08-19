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
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { LocationsService } from "./locations.service";

@Controller("projects/:projectId/locations")
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  list(@Param("projectId") projectId: string) {
    return this.locationsService.list(projectId);
  }

  @Post()
  create(@Param("projectId") projectId: string, @Body() dto: CreateLocationDto) {
    return this.locationsService.create(projectId, dto);
  }

  @Get(":locationId")
  get(@Param("projectId") projectId: string, @Param("locationId") locationId: string) {
    return this.locationsService.get(projectId, locationId);
  }

  @Patch(":locationId")
  update(
    @Param("projectId") projectId: string,
    @Param("locationId") locationId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(projectId, locationId, dto);
  }

  @Delete(":locationId")
  @HttpCode(204)
  remove(@Param("projectId") projectId: string, @Param("locationId") locationId: string) {
    return this.locationsService.remove(projectId, locationId);
  }
}
