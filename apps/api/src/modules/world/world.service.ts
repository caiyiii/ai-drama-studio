import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { PowerSystem as PrismaPowerSystem } from "@prisma/client";
import type { PowerSystem, PowerSystemLevel } from "@ai-drama-studio/types";
import { PrismaService } from "../../prisma/prisma.service";
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

@Injectable()
export class WorldService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorld(projectId: string) {
    await this.ensureProject(projectId);
    const world = await this.prisma.world.findUnique({ where: { projectId } });
    if (!world) {
      throw new NotFoundException("World not found");
    }
    return world;
  }

  async createWorld(projectId: string, dto: CreateWorldDto) {
    await this.ensureProject(projectId);
    const existing = await this.prisma.world.findUnique({ where: { projectId } });
    if (existing) {
      throw new ConflictException("World already exists");
    }
    return this.prisma.world.create({
      data: {
        projectId,
        title: dto.title,
        summary: dto.summary,
        cosmicBackground: dto.cosmicBackground,
        coreConflict: dto.coreConflict,
      },
    });
  }

  async updateWorld(projectId: string, dto: UpdateWorldDto) {
    const world = await this.getWorld(projectId);
    return this.prisma.world.update({
      where: { id: world.id },
      data: dto,
    });
  }

  async deleteWorld(projectId: string) {
    const world = await this.getWorld(projectId);
    await this.prisma.world.delete({ where: { id: world.id } });
  }

  async listCivilizations(projectId: string) {
    const world = await this.getWorld(projectId);
    return this.prisma.civilization.findMany({
      where: { worldId: world.id },
      orderBy: { createdAt: "asc" },
    });
  }

  async createCivilization(projectId: string, dto: CreateCivilizationDto) {
    const world = await this.getWorld(projectId);
    return this.prisma.civilization.create({
      data: { ...dto, worldId: world.id },
    });
  }

  async updateCivilization(
    projectId: string,
    id: string,
    dto: UpdateCivilizationDto,
  ) {
    await this.getCivilization(projectId, id);
    return this.prisma.civilization.update({ where: { id }, data: dto });
  }

  async deleteCivilization(projectId: string, id: string) {
    await this.getCivilization(projectId, id);
    await this.prisma.civilization.delete({ where: { id } });
  }

  async listHistory(projectId: string) {
    const world = await this.getWorld(projectId);
    return this.prisma.worldHistory.findMany({
      where: { worldId: world.id },
      orderBy: { order: "asc" },
    });
  }

  async createHistory(projectId: string, dto: CreateWorldHistoryDto) {
    const world = await this.getWorld(projectId);
    const last = await this.prisma.worldHistory.findFirst({
      where: { worldId: world.id },
      orderBy: { order: "desc" },
    });
    const order = dto.order ?? (last ? last.order + 1 : 0);
    return this.prisma.worldHistory.create({
      data: {
        worldId: world.id,
        title: dto.title,
        description: dto.description,
        order,
      },
    });
  }

  async updateHistory(projectId: string, id: string, dto: UpdateWorldHistoryDto) {
    await this.getHistoryItem(projectId, id);
    return this.prisma.worldHistory.update({ where: { id }, data: dto });
  }

  async deleteHistory(projectId: string, id: string) {
    await this.getHistoryItem(projectId, id);
    await this.prisma.worldHistory.delete({ where: { id } });
  }

  async listFactions(projectId: string) {
    const world = await this.getWorld(projectId);
    return this.prisma.faction.findMany({
      where: { worldId: world.id },
      orderBy: { createdAt: "asc" },
    });
  }

  async createFaction(projectId: string, dto: CreateFactionDto) {
    const world = await this.getWorld(projectId);
    await this.ensureCivilizationOptional(world.id, dto.civilizationId);
    return this.prisma.faction.create({
      data: {
        worldId: world.id,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        civilizationId: dto.civilizationId || null,
      },
    });
  }

  async updateFaction(projectId: string, id: string, dto: UpdateFactionDto) {
    const faction = await this.getFaction(projectId, id);
    if (dto.civilizationId !== undefined) {
      await this.ensureCivilizationOptional(faction.worldId, dto.civilizationId);
    }
    return this.prisma.faction.update({
      where: { id },
      data: {
        ...dto,
        civilizationId:
          dto.civilizationId === undefined ? undefined : dto.civilizationId || null,
      },
    });
  }

  async deleteFaction(projectId: string, id: string) {
    await this.getFaction(projectId, id);
    await this.prisma.faction.delete({ where: { id } });
  }

  async listLocations(projectId: string) {
    const world = await this.getWorld(projectId);
    return this.prisma.worldLocation.findMany({
      where: { worldId: world.id },
      orderBy: { createdAt: "asc" },
    });
  }

  async createLocation(projectId: string, dto: CreateWorldLocationDto) {
    const world = await this.getWorld(projectId);
    await this.ensureCivilizationOptional(world.id, dto.civilizationId);
    return this.prisma.worldLocation.create({
      data: {
        worldId: world.id,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        civilizationId: dto.civilizationId || null,
      },
    });
  }

  async updateLocation(projectId: string, id: string, dto: UpdateWorldLocationDto) {
    const location = await this.getLocation(projectId, id);
    if (dto.civilizationId !== undefined) {
      await this.ensureCivilizationOptional(location.worldId, dto.civilizationId);
    }
    return this.prisma.worldLocation.update({
      where: { id },
      data: {
        ...dto,
        civilizationId:
          dto.civilizationId === undefined ? undefined : dto.civilizationId || null,
      },
    });
  }

  async deleteLocation(projectId: string, id: string) {
    await this.getLocation(projectId, id);
    await this.prisma.worldLocation.delete({ where: { id } });
  }

  async listPowerSystems(projectId: string) {
    const world = await this.getWorld(projectId);
    const rows = await this.prisma.powerSystem.findMany({
      where: { worldId: world.id },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => this.mapPowerSystem(row));
  }

  async createPowerSystem(projectId: string, dto: CreatePowerSystemDto) {
    const world = await this.getWorld(projectId);
    const row = await this.prisma.powerSystem.create({
      data: {
        worldId: world.id,
        name: dto.name,
        description: dto.description,
        rules: (dto.rules ?? []) as unknown as Prisma.InputJsonValue,
        levels: (dto.levels ?? []) as unknown as Prisma.InputJsonValue,
      },
    });
    return this.mapPowerSystem(row);
  }

  async updatePowerSystem(projectId: string, id: string, dto: UpdatePowerSystemDto) {
    await this.getPowerSystemRow(projectId, id);
    const row = await this.prisma.powerSystem.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        ...(dto.rules !== undefined
          ? { rules: dto.rules as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.levels !== undefined
          ? { levels: dto.levels as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
    return this.mapPowerSystem(row);
  }

  async deletePowerSystem(projectId: string, id: string) {
    await this.getPowerSystemRow(projectId, id);
    await this.prisma.powerSystem.delete({ where: { id } });
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return project;
  }

  private async getCivilization(projectId: string, id: string) {
    const world = await this.getWorld(projectId);
    const item = await this.prisma.civilization.findFirst({
      where: { id, worldId: world.id },
    });
    if (!item) {
      throw new NotFoundException("Civilization not found");
    }
    return item;
  }

  private async getHistoryItem(projectId: string, id: string) {
    const world = await this.getWorld(projectId);
    const item = await this.prisma.worldHistory.findFirst({
      where: { id, worldId: world.id },
    });
    if (!item) {
      throw new NotFoundException("History event not found");
    }
    return item;
  }

  private async getFaction(projectId: string, id: string) {
    const world = await this.getWorld(projectId);
    const item = await this.prisma.faction.findFirst({
      where: { id, worldId: world.id },
    });
    if (!item) {
      throw new NotFoundException("Faction not found");
    }
    return item;
  }

  private async getLocation(projectId: string, id: string) {
    const world = await this.getWorld(projectId);
    const item = await this.prisma.worldLocation.findFirst({
      where: { id, worldId: world.id },
    });
    if (!item) {
      throw new NotFoundException("Location not found");
    }
    return item;
  }

  private async getPowerSystemRow(projectId: string, id: string) {
    const world = await this.getWorld(projectId);
    const item = await this.prisma.powerSystem.findFirst({
      where: { id, worldId: world.id },
    });
    if (!item) {
      throw new NotFoundException("Power system not found");
    }
    return item;
  }

  private async ensureCivilizationOptional(
    worldId: string,
    civilizationId: string | null | undefined,
  ) {
    if (!civilizationId) {
      return;
    }
    const item = await this.prisma.civilization.findFirst({
      where: { id: civilizationId, worldId },
    });
    if (!item) {
      throw new NotFoundException("Civilization not found");
    }
  }

  private mapPowerSystem(row: PrismaPowerSystem): PowerSystem {
    return {
      id: row.id,
      worldId: row.worldId,
      name: row.name,
      description: row.description,
      rules: this.toStringList(row.rules),
      levels: this.toLevels(row.levels),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is string => typeof item === "string");
  }

  private toLevels(value: unknown): PowerSystemLevel[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const levels: PowerSystemLevel[] = [];
    for (const item of value) {
      if (typeof item === "string" && item.trim()) {
        levels.push({ name: item.trim() });
        continue;
      }
      if (item && typeof item === "object" && "name" in item) {
        const name = (item as { name: unknown }).name;
        if (typeof name === "string" && name.trim()) {
          const descriptionValue = (item as { description?: unknown }).description;
          levels.push({
            name: name.trim(),
            description:
              typeof descriptionValue === "string" ? descriptionValue : undefined,
          });
        }
      }
    }
    return levels;
  }
}
