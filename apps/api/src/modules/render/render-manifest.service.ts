import { HttpStatus, Injectable } from "@nestjs/common";
import { AssetStatus } from "@prisma/client";
import {
  missingFromMetadata,
  parseResolution,
  stripSecretFields,
} from "@ai-drama-studio/core";
import type { AssetType, RenderManifestSnapshot, RenderSnapshotAsset } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { CompositionService } from "../timeline/composition.service";

@Injectable()
export class RenderManifestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly composition: CompositionService,
  ) {}

  async createSnapshot(projectId: string, episodeId: string): Promise<RenderManifestSnapshot> {
    const manifest = await this.composition.compose(projectId, episodeId);
    const timeline = await this.prisma.episodeTimeline.findUnique({
      where: { episodeId },
    });
    if (!timeline || timeline.projectId !== projectId) {
      throw new AppError(HttpStatus.NOT_FOUND, ErrorCodes.RENDER_TIMELINE_NOT_FOUND, "尚未创建时间线");
    }
    const missing = missingFromMetadata(
      timeline.metadata && typeof timeline.metadata === "object" && !Array.isArray(timeline.metadata)
        ? (timeline.metadata as Record<string, unknown>)
        : null,
    );
    const assetIds = [
      ...new Set(
        manifest.tracks.flatMap((track) => track.clips.map((clip) => clip.assetId).filter(Boolean)),
      ),
    ];
    const rows = assetIds.length
      ? await this.prisma.asset.findMany({
          where: { id: { in: assetIds }, projectId, status: { not: AssetStatus.DELETED } },
        })
      : [];
    const assets: RenderSnapshotAsset[] = rows.map((row) => ({
      id: row.id,
      storageKey: row.storageKey,
      mimeType: row.mimeType,
      type: row.type as AssetType,
      name: row.name,
      durationSeconds: row.durationSeconds,
    }));
    parseResolution(manifest.resolution);
    return stripSecretFields({
      ...manifest,
      missing,
      assets,
    });
  }
}
