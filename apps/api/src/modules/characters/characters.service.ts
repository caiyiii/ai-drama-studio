import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  clampRelationStrength,
  isSelfRelationship,
  sanitizeVoiceProfile,
} from "@ai-drama-studio/core";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { ListCharactersQueryDto } from "./dto/list-characters-query.dto";
import { CreateCharacterDto } from "./dto/create-character.dto";
import { UpdateCharacterDto } from "./dto/update-character.dto";
import { CreateCharacterRelationshipDto } from "./dto/create-character-relationship.dto";
import { UpdateCharacterRelationshipDto } from "./dto/update-character-relationship.dto";
import {
  CHARACTER_INCLUDE,
  RELATIONSHIP_INCLUDE,
  mapCharacter,
  mapRelationship,
  toPrismaRelationType,
  toPrismaStatus,
} from "./character.mapper";

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string, query: ListCharactersQueryDto = {}) {
    await this.ensureProject(projectId);
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize =
      query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 50;
    const where: Prisma.CharacterWhereInput = { projectId };
    const search = query.search?.trim();
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (query.role?.trim()) {
      where.role = query.role.trim();
    }
    if (query.civilizationId?.trim()) {
      where.civilizationId = query.civilizationId.trim();
    }
    if (query.factionId?.trim()) {
      where.factionId = query.factionId.trim();
    }
    const [rows, total] = await Promise.all([
      this.prisma.character.findMany({
        where,
        include: CHARACTER_INCLUDE,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.character.count({ where }),
    ]);
    return {
      items: rows.map((row) => mapCharacter(row)),
      total,
      page,
      pageSize,
    };
  }

  async get(projectId: string, characterId: string) {
    await this.ensureProject(projectId);
    return this.getCharacterInProject(projectId, characterId);
  }

  async create(projectId: string, dto: CreateCharacterDto) {
    await this.ensureProject(projectId);
    await this.ensureCivilization(projectId, dto.civilizationId);
    await this.ensureFaction(projectId, dto.factionId);
    await this.assertUniqueName(projectId, dto.name);
    const world = await this.prisma.world.findUnique({ where: { projectId } });
    const row = await this.prisma.character.create({
      data: {
        projectId,
        worldId: world?.id ?? null,
        name: dto.name.trim(),
        alias: emptyToNull(dto.alias),
        gender: emptyToNull(dto.gender),
        age: dto.age ?? null,
        race: emptyToNull(dto.race),
        identity: emptyToNull(dto.identity),
        role: emptyToNull(dto.role),
        civilizationId: emptyToNull(dto.civilizationId),
        factionId: emptyToNull(dto.factionId),
        description: emptyToNull(dto.description),
        personality: emptyToNull(dto.personality),
        appearance: emptyToNull(dto.appearance),
        background: emptyToNull(dto.background),
        motivation: emptyToNull(dto.motivation),
        goal: emptyToNull(dto.goal),
        conflict: emptyToNull(dto.conflict),
        ability: emptyToNull(dto.ability),
        status: toPrismaStatus(dto.status) ?? "ACTIVE",
      },
      include: CHARACTER_INCLUDE,
    });
    return mapCharacter(row);
  }

  async update(projectId: string, characterId: string, dto: UpdateCharacterDto) {
    const current = await this.getCharacterInProject(projectId, characterId);
    if (dto.name && dto.name.trim() !== current.name) {
      await this.assertUniqueName(projectId, dto.name, characterId);
    }
    if (dto.civilizationId !== undefined) {
      await this.ensureCivilization(projectId, dto.civilizationId);
    }
    if (dto.factionId !== undefined) {
      await this.ensureFaction(projectId, dto.factionId);
    }
    const row = await this.prisma.character.update({
      where: { id: characterId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.alias !== undefined ? { alias: emptyToNull(dto.alias) } : {}),
        ...(dto.gender !== undefined ? { gender: emptyToNull(dto.gender) } : {}),
        ...(dto.age !== undefined ? { age: dto.age } : {}),
        ...(dto.race !== undefined ? { race: emptyToNull(dto.race) } : {}),
        ...(dto.identity !== undefined ? { identity: emptyToNull(dto.identity) } : {}),
        ...(dto.role !== undefined ? { role: emptyToNull(dto.role) } : {}),
        ...(dto.civilizationId !== undefined
          ? { civilizationId: emptyToNull(dto.civilizationId) }
          : {}),
        ...(dto.factionId !== undefined
          ? { factionId: emptyToNull(dto.factionId) }
          : {}),
        ...(dto.description !== undefined
          ? { description: emptyToNull(dto.description) }
          : {}),
        ...(dto.personality !== undefined
          ? { personality: emptyToNull(dto.personality) }
          : {}),
        ...(dto.appearance !== undefined
          ? { appearance: emptyToNull(dto.appearance) }
          : {}),
        ...(dto.background !== undefined
          ? { background: emptyToNull(dto.background) }
          : {}),
        ...(dto.motivation !== undefined
          ? { motivation: emptyToNull(dto.motivation) }
          : {}),
        ...(dto.goal !== undefined ? { goal: emptyToNull(dto.goal) } : {}),
        ...(dto.conflict !== undefined
          ? { conflict: emptyToNull(dto.conflict) }
          : {}),
        ...(dto.ability !== undefined ? { ability: emptyToNull(dto.ability) } : {}),
        ...(dto.status !== undefined ? { status: toPrismaStatus(dto.status) } : {}),
        ...(dto.voiceProfile !== undefined
          ? {
              voiceProfile: sanitizeVoiceProfile(dto.voiceProfile) as Prisma.InputJsonValue,
            }
          : {}),
      },
      include: CHARACTER_INCLUDE,
    });
    return mapCharacter(row);
  }

  async remove(projectId: string, characterId: string) {
    await this.getCharacterInProject(projectId, characterId);
    await this.prisma.character.delete({ where: { id: characterId } });
  }

  async listRelationships(projectId: string) {
    await this.ensureProject(projectId);
    const rows = await this.prisma.characterRelationship.findMany({
      where: { projectId },
      include: RELATIONSHIP_INCLUDE,
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => mapRelationship(row));
  }

  async getRelationship(projectId: string, relationshipId: string) {
    await this.ensureProject(projectId);
    const row = await this.prisma.characterRelationship.findFirst({
      where: { id: relationshipId, projectId },
      include: RELATIONSHIP_INCLUDE,
    });
    if (!row) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.RELATIONSHIP_NOT_FOUND,
        "人物关系不存在",
      );
    }
    return mapRelationship(row);
  }

  async createRelationship(
    projectId: string,
    dto: CreateCharacterRelationshipDto,
  ) {
    await this.ensureProject(projectId);
    if (isSelfRelationship(dto.fromCharacterId, dto.toCharacterId)) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.INVALID_CHARACTER_RELATIONSHIP,
        "不能将人物关联到自己",
      );
    }
    await this.getCharacterInProject(projectId, dto.fromCharacterId);
    await this.getCharacterInProject(projectId, dto.toCharacterId);
    const duplicate = await this.prisma.characterRelationship.findUnique({
      where: {
        fromCharacterId_toCharacterId_type: {
          fromCharacterId: dto.fromCharacterId,
          toCharacterId: dto.toCharacterId,
          type: toPrismaRelationType(dto.type),
        },
      },
    });
    if (duplicate) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.DUPLICATE_CHARACTER_RELATIONSHIP,
        "相同人物关系已存在",
      );
    }
    try {
      const row = await this.prisma.characterRelationship.create({
        data: {
          projectId,
          fromCharacterId: dto.fromCharacterId,
          toCharacterId: dto.toCharacterId,
          type: toPrismaRelationType(dto.type),
          label: emptyToNull(dto.label),
          description: emptyToNull(dto.description),
          strength: clampRelationStrength(dto.strength),
        },
        include: RELATIONSHIP_INCLUDE,
      });
      return mapRelationship(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ErrorCodes.DUPLICATE_CHARACTER_RELATIONSHIP,
          "相同人物关系已存在",
        );
      }
      throw error;
    }
  }

  async updateRelationship(
    projectId: string,
    relationshipId: string,
    dto: UpdateCharacterRelationshipDto,
  ) {
    const current = await this.getRelationship(projectId, relationshipId);
    const nextType = dto.type ?? current.type;
    if (dto.type && dto.type !== current.type) {
      const duplicate = await this.prisma.characterRelationship.findUnique({
        where: {
          fromCharacterId_toCharacterId_type: {
            fromCharacterId: current.fromCharacterId,
            toCharacterId: current.toCharacterId,
            type: toPrismaRelationType(nextType),
          },
        },
      });
      if (duplicate && duplicate.id !== relationshipId) {
        throw new AppError(
          HttpStatus.CONFLICT,
          ErrorCodes.DUPLICATE_CHARACTER_RELATIONSHIP,
          "相同人物关系已存在",
        );
      }
    }
    const row = await this.prisma.characterRelationship.update({
      where: { id: relationshipId },
      data: {
        ...(dto.type !== undefined
          ? { type: toPrismaRelationType(dto.type) }
          : {}),
        ...(dto.label !== undefined ? { label: emptyToNull(dto.label) } : {}),
        ...(dto.description !== undefined
          ? { description: emptyToNull(dto.description) }
          : {}),
        ...(dto.strength !== undefined
          ? { strength: clampRelationStrength(dto.strength) }
          : {}),
      },
      include: RELATIONSHIP_INCLUDE,
    });
    return mapRelationship(row);
  }

  async removeRelationship(projectId: string, relationshipId: string) {
    await this.getRelationship(projectId, relationshipId);
    await this.prisma.characterRelationship.delete({
      where: { id: relationshipId },
    });
  }

  private async assertUniqueName(
    projectId: string,
    name: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.character.findFirst({
      where: {
        projectId,
        name: { equals: name.trim(), mode: "insensitive" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.CHARACTER_NAME_CONFLICT,
        `项目中已经存在名为 ${existing.name} 的角色`,
      );
    }
  }

  private async ensureProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.PROJECT_NOT_FOUND,
        "项目不存在",
      );
    }
    return project;
  }

  private async getCharacterInProject(projectId: string, characterId: string) {
    const row = await this.prisma.character.findUnique({
      where: { id: characterId },
      include: CHARACTER_INCLUDE,
    });
    if (!row) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.CHARACTER_NOT_FOUND,
        "人物不存在",
      );
    }
    if (row.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.CHARACTER_NOT_IN_PROJECT,
        "人物不属于当前项目",
      );
    }
    return mapCharacter(row);
  }

  private async ensureCivilization(
    projectId: string,
    civilizationId: string | null | undefined,
  ) {
    const id = emptyToNull(civilizationId);
    if (!id) {
      return;
    }
    const world = await this.prisma.world.findUnique({ where: { projectId } });
    if (!world) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.CIVILIZATION_NOT_IN_PROJECT,
        "文明不属于当前项目",
      );
    }
    const item = await this.prisma.civilization.findFirst({
      where: { id, worldId: world.id },
    });
    if (!item) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.CIVILIZATION_NOT_IN_PROJECT,
        "文明不属于当前项目",
      );
    }
  }

  private async ensureFaction(
    projectId: string,
    factionId: string | null | undefined,
  ) {
    const id = emptyToNull(factionId);
    if (!id) {
      return;
    }
    const world = await this.prisma.world.findUnique({ where: { projectId } });
    if (!world) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.FACTION_NOT_IN_PROJECT,
        "势力不属于当前项目",
      );
    }
    const item = await this.prisma.faction.findFirst({
      where: { id, worldId: world.id },
    });
    if (!item) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.FACTION_NOT_IN_PROJECT,
        "势力不属于当前项目",
      );
    }
  }
}

function emptyToNull(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value.trim() === "") {
    return null;
  }
  return value.trim();
}
