import { HttpStatus, Injectable } from "@nestjs/common";
import {
  AssetStatus,
  AudioAssetRole,
  Prisma,
  ScriptBlockAssetRole,
  ScriptBlockType,
  TimelineClipSourceType,
  TimelineClipType,
  TimelineStatus,
  TimelineTrackType,
} from "@prisma/client";
import {
  defaultTrackName,
  emptyMissingAssets,
  hasMissingAssets,
  pickFinalAsset,
  resolveVisualClip,
  type ShotTimingInput,
} from "@ai-drama-studio/core";
import type { TimelineBuildResult, TimelineMissingAssets } from "@ai-drama-studio/types";
import { AppError, ErrorCodes } from "../../common/app-error";
import { PrismaService } from "../../prisma/prisma.service";
import { TimelineContinuityService } from "./timeline-continuity.service";
import { TimelineService, TIMELINE_INCLUDE } from "./timeline.service";
import { TimelineTimingService } from "./timeline-timing.service";

type PlannedClip = {
  type: TimelineClipType;
  sourceType: TimelineClipSourceType;
  sourceId: string;
  assetId: string;
  startTime: number;
  duration: number;
  sourceStartTime: number;
  sourceDuration: number;
  zIndex: number;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class TimelineBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly continuity: TimelineContinuityService,
    private readonly timing: TimelineTimingService,
    private readonly timelines: TimelineService,
  ) {}

  async build(
    projectId: string,
    episodeId: string,
    rebuild = false,
  ): Promise<TimelineBuildResult> {
    await this.continuity.ensureEpisode(projectId, episodeId);
    const existing = await this.prisma.episodeTimeline.findUnique({
      where: { episodeId },
    });
    if (existing && existing.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TIMELINE_PROJECT_MISMATCH,
        "时间线不属于当前项目",
      );
    }
    if (existing && !rebuild) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.TIMELINE_ALREADY_EXISTS,
        "该剧集已经存在时间线",
      );
    }
    if (existing?.status === TimelineStatus.LOCKED) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ErrorCodes.TIMELINE_ALREADY_LOCKED,
        "时间线已锁定，无法重建",
      );
    }

    try {
      const plan = await this.plan(projectId, episodeId);
      const nextVersion = existing ? existing.version + 1 : 1;
      const created = await this.prisma.$transaction(async (tx) => {
        if (existing) {
          await tx.timelineClip.deleteMany({ where: { track: { timelineId: existing.id } } });
          await tx.timelineTrack.deleteMany({ where: { timelineId: existing.id } });
          return tx.episodeTimeline.update({
            where: { id: existing.id },
            data: {
              version: nextVersion,
              status: plan.status,
              durationSeconds: plan.durationSeconds,
              sourceStoryboardVersion: plan.sourceStoryboardVersion,
              sourceScriptVersion: plan.sourceScriptVersion,
              sourceAssetVersionSummary: plan.sourceAssetVersionSummary as Prisma.InputJsonValue,
              metadata: plan.metadata as Prisma.InputJsonValue,
              tracks: { create: plan.tracks },
            },
            include: TIMELINE_INCLUDE,
          });
        }
        return tx.episodeTimeline.create({
          data: {
            projectId,
            episodeId,
            version: 1,
            status: plan.status,
            durationSeconds: plan.durationSeconds,
            fps: 24,
            resolution: "1920x1080",
            aspectRatio: "16:9",
            sourceStoryboardVersion: plan.sourceStoryboardVersion,
            sourceScriptVersion: plan.sourceScriptVersion,
            sourceAssetVersionSummary: plan.sourceAssetVersionSummary as Prisma.InputJsonValue,
            metadata: plan.metadata as Prisma.InputJsonValue,
            tracks: { create: plan.tracks },
          },
          include: TIMELINE_INCLUDE,
        });
      });
      const timeline = await this.timelines.withComputedStatus(created);
      return {
        timeline,
        created: !existing,
        rebuilt: Boolean(existing),
        missing: plan.missing,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      const detail = error instanceof Error ? error.message : "unknown";
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ErrorCodes.TIMELINE_BUILD_FAILED,
        `时间线构建失败: ${detail}`,
      );
    }
  }

  private async plan(projectId: string, episodeId: string) {
    const missing: TimelineMissingAssets = emptyMissingAssets();
    const storyboard = await this.prisma.storyboard.findUnique({
      where: { episodeId },
      include: {
        shots: {
          orderBy: { shotNumber: "asc" },
          include: {
            shotAssets: { include: { asset: true } },
          },
        },
      },
    });
    if (storyboard && storyboard.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TIMELINE_PROJECT_MISMATCH,
        "分镜不属于当前项目",
      );
    }
    const script = await this.prisma.script.findUnique({
      where: { episodeId },
      include: {
        scenes: {
          orderBy: { number: "asc" },
          include: {
            blocks: {
              orderBy: { order: "asc" },
              include: { blockAssets: { include: { asset: true } } },
            },
          },
        },
      },
    });
    if (script && script.projectId !== projectId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ErrorCodes.TIMELINE_PROJECT_MISMATCH,
        "剧本不属于当前项目",
      );
    }

    const shotInputs: ShotTimingInput[] = (storyboard?.shots ?? []).map((shot) => {
      const metadata =
        shot.metadata && typeof shot.metadata === "object" && !Array.isArray(shot.metadata)
          ? (shot.metadata as Record<string, unknown>)
          : {};
      return {
        id: shot.id,
        shotNumber: shot.shotNumber,
        durationSeconds: shot.durationSeconds,
        sceneId: shot.sceneId,
        scriptBlockId: shot.scriptBlockId,
        sourceScriptBlockIds: metadata.sourceScriptBlockIds,
      };
    });
    const shots = this.timing.shotTimeline(shotInputs);
    const scenes = this.timing.sceneTimeline(shots);
    const visualClips: PlannedClip[] = [];
    const imageClips: PlannedClip[] = [];

    for (const shot of shots) {
      const raw = storyboard?.shots.find((item) => item.id === shot.id);
      const candidates = (raw?.shotAssets ?? [])
        .filter((item) => item.asset.projectId === projectId && item.asset.status !== AssetStatus.DELETED)
        .map((item) => ({
          id: item.asset.id,
          type: item.asset.type,
          role: item.role,
          isPrimary: item.isPrimary,
          status: item.asset.status,
        }));
      const video = pickFinalAsset(
        candidates.filter((item) => item.type === "VIDEO"),
        "VIDEO",
      );
      const image = pickFinalAsset(
        candidates.filter((item) => item.type === "IMAGE"),
        "IMAGE",
      );
      const visual = resolveVisualClip({ video, image });
      if (!visual) {
        missing.visual.push({ shotId: shot.id, shotNumber: shot.shotNumber });
        continue;
      }
      const clip: PlannedClip = {
        type: visual.kind === "VIDEO" ? TimelineClipType.VIDEO : TimelineClipType.IMAGE,
        sourceType: TimelineClipSourceType.STORYBOARD_SHOT,
        sourceId: shot.id,
        assetId: visual.assetId,
        startTime: shot.startTime,
        duration: Math.max(shot.durationSeconds, 0.0001),
        sourceStartTime: 0,
        sourceDuration: Math.max(shot.durationSeconds, 0.0001),
        zIndex: visual.kind === "VIDEO" ? 2 : 1,
        metadata: { shotNumber: shot.shotNumber, sceneId: shot.sceneId },
      };
      if (visual.kind === "VIDEO") {
        visualClips.push(clip);
      } else {
        imageClips.push(clip);
      }
    }

    const dialogueBlocks = (script?.scenes ?? [])
      .flatMap((scene) => scene.blocks)
      .filter((block) => block.type === ScriptBlockType.DIALOGUE);
    const dialogueWithAudio = dialogueBlocks
      .map((block) => {
        const candidates = block.blockAssets
          .filter(
            (item) =>
              item.asset.projectId === projectId &&
              item.asset.status !== AssetStatus.DELETED &&
              item.asset.type === "AUDIO" &&
              (item.role === ScriptBlockAssetRole.FINAL || item.isPrimary),
          )
          .map((item) => ({
            id: item.asset.id,
            type: item.asset.type,
            role: item.role,
            isPrimary: item.isPrimary,
            status: item.asset.status,
            durationSeconds: item.asset.durationSeconds,
          }));
        const audio = pickFinalAsset(candidates, "AUDIO");
        const duration = candidates.find((item) => item.id === audio?.id)?.durationSeconds;
        return { block, audio, duration };
      });
    for (const item of dialogueWithAudio) {
      if (!item.audio) {
        missing.dialogue.push({ blockId: item.block.id });
      }
    }
    const dialogueTiming = this.timing.dialogueTimeline({
      blocks: dialogueWithAudio
        .filter((item) => item.audio)
        .map((item) => ({
          id: item.block.id,
          durationSeconds: item.duration && item.duration > 0 ? item.duration : 1,
        })),
      shots,
    });
    const dialogueClips: PlannedClip[] = [];
    for (const entry of dialogueTiming) {
      const source = dialogueWithAudio.find((item) => item.block.id === entry.blockId);
      const audioId = source?.audio?.id;
      if (!audioId) {
        continue;
      }
      dialogueClips.push({
        type: TimelineClipType.AUDIO,
        sourceType: TimelineClipSourceType.SCRIPT_BLOCK,
        sourceId: entry.blockId,
        assetId: audioId,
        startTime: entry.startTime,
        duration: entry.duration,
        sourceStartTime: 0,
        sourceDuration: entry.duration,
        zIndex: 0,
        metadata: { blockId: entry.blockId },
      });
    }

    const episodeAudio = await this.prisma.episodeAudioAsset.findMany({
      where: { episodeId },
      include: { asset: true, episode: true },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    });
    const ownedAudio = episodeAudio.filter(
      (item) => item.episode.projectId === projectId && item.asset.projectId === projectId,
    );
    const visualDuration = this.timing.timelineDuration(shots);
    const musicRow = ownedAudio.find(
      (item) =>
        item.role === AudioAssetRole.MUSIC &&
        item.isPrimary &&
        item.asset.status !== AssetStatus.DELETED,
    );
    missing.music = !musicRow;
    const musicClips: PlannedClip[] = [];
    if (musicRow) {
      const assetDuration =
        musicRow.asset.durationSeconds && musicRow.asset.durationSeconds > 0
          ? musicRow.asset.durationSeconds
          : visualDuration || 1;
      const duration = this.timing.musicDuration(assetDuration, visualDuration || assetDuration);
      musicClips.push({
        type: TimelineClipType.AUDIO,
        sourceType: TimelineClipSourceType.EPISODE_AUDIO,
        sourceId: musicRow.id,
        assetId: musicRow.assetId,
        startTime: 0,
        duration,
        sourceStartTime: 0,
        sourceDuration: duration,
        zIndex: 0,
        metadata: { role: "MUSIC" },
      });
    }

    const sfxRows = ownedAudio.filter(
      (item) => item.role === AudioAssetRole.SFX && item.asset.status !== AssetStatus.DELETED,
    );
    missing.sfx = sfxRows.length === 0;
    const sfxClips: PlannedClip[] = sfxRows.map((row) => {
      const meta =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {};
      const shotId = typeof meta.shotId === "string" ? meta.shotId : null;
      const sceneId = typeof meta.sceneId === "string" ? meta.sceneId : null;
      const startTime = this.timing.sfxStartTime({ shotId, sceneId, shots, scenes });
      const duration =
        row.asset.durationSeconds && row.asset.durationSeconds > 0
          ? row.asset.durationSeconds
          : 1;
      return {
        type: TimelineClipType.AUDIO,
        sourceType: TimelineClipSourceType.EPISODE_AUDIO,
        sourceId: row.id,
        assetId: row.assetId,
        startTime,
        duration,
        sourceStartTime: 0,
        sourceDuration: duration,
        zIndex: 0,
        metadata: { role: "SFX", shotId, sceneId },
      };
    });

    const allClips = [...visualClips, ...imageClips, ...dialogueClips, ...musicClips, ...sfxClips];
    const durationSeconds = this.timing.timelineDuration(shots, allClips);
    const fingerprint = await this.continuity.currentAssetFingerprint(projectId, episodeId);
    const status = hasMissingAssets(missing)
      ? TimelineStatus.DRAFT
      : TimelineStatus.PREVIEW_READY;

    const tracks = [
      this.trackCreate(TimelineTrackType.VIDEO, 0, visualClips),
      this.trackCreate(TimelineTrackType.IMAGE, 1, imageClips),
      this.trackCreate(TimelineTrackType.DIALOGUE, 2, dialogueClips),
      this.trackCreate(TimelineTrackType.MUSIC, 3, musicClips),
      this.trackCreate(TimelineTrackType.SFX, 4, sfxClips),
    ];

    return {
      durationSeconds,
      status,
      sourceStoryboardVersion: storyboard?.version ?? null,
      sourceScriptVersion: script?.version ?? null,
      sourceAssetVersionSummary: {
        fingerprint,
        visualAssetCount: visualClips.length + imageClips.length,
        dialogueAssetCount: dialogueClips.length,
        musicAssetCount: musicClips.length,
        sfxAssetCount: sfxClips.length,
      },
      metadata: {
        missingVisualAsset: missing.visual,
        missingDialogueAudio: missing.dialogue,
        missingMusicAsset: missing.music,
        missingSfxAsset: missing.sfx,
      },
      missing,
      tracks,
    };
  }

  private trackCreate(type: TimelineTrackType, order: number, clips: PlannedClip[]) {
    return {
      type,
      name: defaultTrackName(type),
      order,
      enabled: true,
      muted: false,
      volume: 1,
      clips: {
        create: clips.map((clip) => ({
          type: clip.type,
          sourceType: clip.sourceType,
          sourceId: clip.sourceId,
          assetId: clip.assetId,
          startTime: clip.startTime,
          duration: clip.duration,
          sourceStartTime: clip.sourceStartTime,
          sourceDuration: clip.sourceDuration,
          zIndex: clip.zIndex,
          volume: 1,
          speed: 1,
          opacity: 1,
          enabled: true,
          metadata: (clip.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        })),
      },
    };
  }
}
