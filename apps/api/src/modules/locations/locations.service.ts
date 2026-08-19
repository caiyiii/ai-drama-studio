import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { mapLocation } from "./location.mapper";

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string) {
    await this.ensureProject(projectId);
    const rows = await this.prisma.location.findMany({
      where: { projectId },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(mapLocation);
  }

  async get(projectId: string, locationId: string) {
    await this.ensureProject(projectId);
    return this.getInProject(projectId, locationId);
  }

  async create(projectId: string, dto: CreateLocationDto) {
    await this.ensureProject(projectId);
    await this.assertUniqueName(projectId, dto.name.trim());
    const row = await this.prisma.location.create({
      data: {
        projectId,
        name: dto.name.trim(),
        description: emptyToNull(dto.description),
        environment: emptyToNull(dto.environment),
        atmosphere: emptyToNull(dto.atmosphere),
        visualStyle: emptyToNull(dto.visualStyle),
        tags: dto.tags?.length ? (dto.tags as Prisma.InputJsonValue) : undefined,
      },
    });
    return mapLocation(row);
  }

  async update(projectId: string, locationId: string, dto: UpdateLocationDto) {
    await this.ensureProject(projectId);
    const current = await this.getInProject(projectId, locationId);
    if (dto.name?.trim() && dto.name.trim() !== current.name) {
      await this.assertUniqueName(projectId, dto.name.trim(), locationId);
    }
    const row = await this.prisma.location.update({
      where: { id: locationId },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : emptyToNull(dto.description),
        environment: dto.environment === undefined ? undefined : emptyToNull(dto.environment),
        atmosphere: dto.atmosphere === undefined ? undefined : emptyToNull(dto.atmosphere),
        visualStyle: dto.visualStyle === undefined ? undefined : emptyToNull(dto.visualStyle),
        tags: dto.tags === undefined ? undefined : (dto.tags as Prisma.InputJsonValue),
      },
    });
    return mapLocation(row);
  }

  async remove(projectId: string, locationId: string) {
    await this.ensureProject(projectId);
    await this.getInProject(projectId, locationId);
    await this.prisma.location.delete({ where: { id: locationId } });
  }

  private async getInProject(projectId: string, locationId: string) {
    const row = await this.prisma.location.findFirst({
      where: { id: locationId, projectId },
    });
    if (!row) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.LOCATION_NOT_FOUND,
        "场景不存在",
      );
    }
    return mapLocation(row);
  }

  private async assertUniqueName(projectId: string, name: string, excludeId?: string) {
    const existing = await this.prisma.location.findFirst({
      where: {
        projectId,
        name: { equals: name, mode: "insensitive" },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.LOCATION_NAME_CONFLICT,
        "场景名称已存在",
      );
    }
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.PROJECT_NOT_FOUND,
        "项目不存在",
      );
    }
  }
}

function emptyToNull(value?: string | null) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
