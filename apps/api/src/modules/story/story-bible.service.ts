import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateStoryBibleDto,
  UpdateStoryBibleDto,
} from "./dto/story-bible.dto";
import { mapStoryBible } from "./story.mapper";

@Injectable()
export class StoryBibleService {
  constructor(private readonly prisma: PrismaService) {}

  async get(projectId: string) {
    await this.ensureProject(projectId);
    const row = await this.prisma.storyBible.findUnique({
      where: { projectId },
    });
    if (!row) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ErrorCodes.STORY_BIBLE_NOT_FOUND,
        "尚未创建故事圣经",
      );
    }
    return mapStoryBible(row);
  }

  async create(projectId: string, dto: CreateStoryBibleDto) {
    await this.ensureProject(projectId);
    const existing = await this.prisma.storyBible.findUnique({
      where: { projectId },
    });
    if (existing) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.STORY_BIBLE_EXISTS,
        "该项目已经存在故事圣经",
      );
    }
    const row = await this.prisma.storyBible.create({
      data: {
        projectId,
        title: dto.title.trim(),
        logline: emptyToNull(dto.logline),
        premise: emptyToNull(dto.premise),
        theme: emptyToNull(dto.theme),
        tone: emptyToNull(dto.tone),
        style: emptyToNull(dto.style),
        audience: emptyToNull(dto.audience),
        storyPromise: emptyToNull(dto.storyPromise),
        rules: (dto.rules ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        timelineSummary: emptyToNull(dto.timelineSummary),
        continuityNotes: emptyToNull(dto.continuityNotes),
      },
    });
    return mapStoryBible(row);
  }

  async update(projectId: string, dto: UpdateStoryBibleDto) {
    await this.get(projectId);
    const row = await this.prisma.storyBible.update({
      where: { projectId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.logline !== undefined ? { logline: emptyToNull(dto.logline) } : {}),
        ...(dto.premise !== undefined ? { premise: emptyToNull(dto.premise) } : {}),
        ...(dto.theme !== undefined ? { theme: emptyToNull(dto.theme) } : {}),
        ...(dto.tone !== undefined ? { tone: emptyToNull(dto.tone) } : {}),
        ...(dto.style !== undefined ? { style: emptyToNull(dto.style) } : {}),
        ...(dto.audience !== undefined ? { audience: emptyToNull(dto.audience) } : {}),
        ...(dto.storyPromise !== undefined
          ? { storyPromise: emptyToNull(dto.storyPromise) }
          : {}),
        ...(dto.rules !== undefined
          ? { rules: (dto.rules ?? Prisma.JsonNull) as Prisma.InputJsonValue }
          : {}),
        ...(dto.timelineSummary !== undefined
          ? { timelineSummary: emptyToNull(dto.timelineSummary) }
          : {}),
        ...(dto.continuityNotes !== undefined
          ? { continuityNotes: emptyToNull(dto.continuityNotes) }
          : {}),
      },
    });
    return mapStoryBible(row);
  }

  async remove(projectId: string) {
    await this.get(projectId);
    await this.prisma.storyBible.delete({ where: { projectId } });
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
}

function emptyToNull(value?: string | null): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || !value.trim()) {
    return null;
  }
  return value.trim();
}
