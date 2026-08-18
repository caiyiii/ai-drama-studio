import { createReadStream } from "node:fs";
import { HttpStatus, Injectable, StreamableFile } from "@nestjs/common";
import { renderArtifactStorageKey } from "@ai-drama-studio/core";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { AssetStorageService } from "../assets/asset-storage.service";
import { mapRenderArtifact } from "./render.mapper";
import type { ProbeResult } from "./ffmpeg-probe";

@Injectable()
export class RenderArtifactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: AssetStorageService,
  ) {}

  async storeOutput(input: {
    projectId: string;
    episodeId: string;
    renderJobId: string;
    sourcePath: string;
    probe: ProbeResult;
  }) {
    const storageKey = renderArtifactStorageKey({
      projectId: input.projectId,
      episodeId: input.episodeId,
      renderJobId: input.renderJobId,
    });
    const saved = await this.storage.saveFromFile({
      storageKey,
      sourcePath: input.sourcePath,
      mimeType: "video/mp4",
    });
    if (!(saved.sizeBytes > 0)) {
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCodes.RENDER_OUTPUT_INVALID,
        "输出文件为空",
      );
    }
    return this.prisma.renderArtifact.create({
      data: {
        projectId: input.projectId,
        episodeId: input.episodeId,
        renderJobId: input.renderJobId,
        type: "EPISODE_VIDEO",
        storageKey: saved.storageKey,
        mimeType: "video/mp4",
        fileSize: saved.sizeBytes,
        durationSeconds: input.probe.durationSeconds,
        width: input.probe.width,
        height: input.probe.height,
        fps: input.probe.fps,
      },
    });
  }

  async get(projectId: string, artifactId: string) {
    const row = await this.require(projectId, artifactId);
    return mapRenderArtifact(row);
  }

  async getFile(projectId: string, artifactId: string) {
    const row = await this.require(projectId, artifactId);
    const fullPath = this.storage.resolvePath(row.storageKey);
    return new StreamableFile(createReadStream(fullPath), {
      type: row.mimeType || "video/mp4",
      disposition: `inline; filename="episode-${row.id}.mp4"`,
    });
  }

  async require(projectId: string, artifactId: string) {
    const row = await this.prisma.renderArtifact.findUnique({ where: { id: artifactId } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.RENDER_ARTIFACT_NOT_FOUND, "成片不存在");
    }
    if (row.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.RENDER_PROJECT_MISMATCH,
        "成片不属于当前项目",
      );
    }
    return row;
  }
}
