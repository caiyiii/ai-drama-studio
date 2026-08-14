import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.warn(
        "PostgreSQL is not available. GET /health still works; project APIs require the database.",
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }
}
