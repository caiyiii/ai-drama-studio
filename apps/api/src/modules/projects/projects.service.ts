import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";

const DEFAULT_USER_EMAIL = "studio@local";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return project;
  }

  async create(dto: CreateProjectDto) {
    const user = await this.getOrCreateDefaultUser();
    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        genre: dto.genre,
        status: "DRAFT",
        currentStep: "WORLD",
        userId: user.id,
      },
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
  }

  private async getOrCreateDefaultUser() {
    return this.prisma.user.upsert({
      where: { email: DEFAULT_USER_EMAIL },
      update: {},
      create: {
        email: DEFAULT_USER_EMAIL,
        name: "Local Studio",
      },
    });
  }
}
