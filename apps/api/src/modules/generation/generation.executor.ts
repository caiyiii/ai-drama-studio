import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { GenerationTaskStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { userFacingAiError } from "../ai/ai.errors";

@Injectable()
export class GenerationExecutor {
  private readonly logger = new Logger(GenerationExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  async run<T>(
    taskId: string,
    work: () => Promise<T>,
    secret?: string,
  ): Promise<T> {
    await this.prisma.generationTask.update({
      where: { id: taskId },
      data: { status: GenerationTaskStatus.RUNNING, error: null },
    });

    try {
      const output = await work();
      await this.prisma.generationTask.update({
        where: { id: taskId },
        data: {
          status: GenerationTaskStatus.SUCCEEDED,
          output: output as unknown as Prisma.InputJsonValue,
          error: null,
        },
      });
      return output;
    } catch (error) {
      const message = userFacingAiError(error, secret);
      this.logger.warn(`Generation task ${taskId} failed: ${message}`);
      await this.prisma.generationTask.update({
        where: { id: taskId },
        data: {
          status: GenerationTaskStatus.FAILED,
          error: message,
        },
      });
      throw error;
    }
  }

  async getTask(projectId: string, id: string) {
    const task = await this.prisma.generationTask.findFirst({
      where: { id, projectId },
    });
    if (!task) {
      throw new NotFoundException("Generation task not found");
    }
    return task;
  }
}
