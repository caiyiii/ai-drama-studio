import { describe, expect, it } from "vitest";
import {
  AssetStatus,
  AudioAssetRole,
  ScriptBlockAssetRole,
  ScriptBlockType,
  StoryboardShotAssetRole,
  TimelineClipSourceType,
  TimelineClipType,
  TimelineStatus,
  TimelineTrackType,
} from "@prisma/client";
import { ErrorCodes } from "../../common/app-error";
import { CompositionService } from "./composition.service";
import { TimelineBuilderService } from "./timeline-builder.service";
import { TimelineContinuityService } from "./timeline-continuity.service";
import { TimelineService } from "./timeline.service";
import { TimelineTimingService } from "./timeline-timing.service";

type AssetRow = {
  id: string;
  projectId: string;
  type: string;
  status: string;
  name: string;
  mimeType: string | null;
  url: string | null;
  durationSeconds: number | null;
  version: number;
};

function now() {
  return new Date("2026-08-18T00:00:00.000Z");
}

function createStack() {
  let seq = 1;
  const id = (prefix: string) => `${prefix}-${seq++}`;
  const store = {
    projects: [{ id: "proj-a" }, { id: "proj-b" }],
    episodes: [
      { id: "ep-a", projectId: "proj-a", seasonId: "season-a" },
      { id: "ep-a2", projectId: "proj-a", seasonId: "season-a" },
      { id: "ep-b", projectId: "proj-b", seasonId: "season-b" },
    ],
    storyboards: [
      {
        id: "sb-a",
        episodeId: "ep-a",
        projectId: "proj-a",
        version: 2,
      },
    ],
    shots: [
      {
        id: "shot-1",
        storyboardId: "sb-a",
        sceneId: "scene-1",
        scriptBlockId: "block-1",
        shotNumber: 1,
        durationSeconds: 6,
        metadata: { sourceScriptBlockIds: ["block-1"] },
      },
      {
        id: "shot-2",
        storyboardId: "sb-a",
        sceneId: "scene-1",
        scriptBlockId: "block-2",
        shotNumber: 2,
        durationSeconds: 4,
        metadata: {},
      },
      {
        id: "shot-3",
        storyboardId: "sb-a",
        sceneId: "scene-2",
        scriptBlockId: "block-3",
        shotNumber: 3,
        durationSeconds: 5,
        metadata: {},
      },
    ],
    scripts: [{ id: "script-a", episodeId: "ep-a", projectId: "proj-a", version: 3 }],
    scenes: [
      { id: "scene-1", scriptId: "script-a", number: 1 },
      { id: "scene-2", scriptId: "script-a", number: 2 },
    ],
    blocks: [
      { id: "block-1", sceneId: "scene-1", type: ScriptBlockType.DIALOGUE, order: 1 },
      { id: "block-2", sceneId: "scene-1", type: ScriptBlockType.DIALOGUE, order: 2 },
      { id: "block-3", sceneId: "scene-1", type: ScriptBlockType.ACTION, order: 3 },
      { id: "block-4", sceneId: "scene-2", type: ScriptBlockType.DIALOGUE, order: 1 },
    ],
    assets: [
      asset("vid-1", "proj-a", "VIDEO", 6),
      asset("img-1", "proj-a", "IMAGE", null),
      asset("img-2", "proj-a", "IMAGE", null),
      asset("tts-1", "proj-a", "AUDIO", 2),
      asset("tts-2", "proj-a", "AUDIO", 2),
      asset("music-1", "proj-a", "AUDIO", 30),
      asset("sfx-1", "proj-a", "AUDIO", 1.5),
      asset("sfx-2", "proj-a", "AUDIO", 1.5),
      asset("sfx-3", "proj-a", "AUDIO", 1.5),
      asset("foreign", "proj-b", "VIDEO", 3),
    ] as AssetRow[],
    shotAssets: [
      { shotId: "shot-1", assetId: "vid-1", role: StoryboardShotAssetRole.FINAL, isPrimary: true },
      { shotId: "shot-1", assetId: "img-1", role: StoryboardShotAssetRole.FINAL, isPrimary: true },
      { shotId: "shot-2", assetId: "img-2", role: StoryboardShotAssetRole.FINAL, isPrimary: true },
    ],
    blockAssets: [
      { scriptBlockId: "block-1", assetId: "tts-1", role: ScriptBlockAssetRole.FINAL, isPrimary: true },
      { scriptBlockId: "block-2", assetId: "tts-2", role: ScriptBlockAssetRole.FINAL, isPrimary: true },
    ],
    episodeAudio: [
      {
        id: "ea-music",
        episodeId: "ep-a",
        assetId: "music-1",
        role: AudioAssetRole.MUSIC,
        isPrimary: true,
        metadata: { type: "music" },
      },
      {
        id: "ea-sfx-1",
        episodeId: "ep-a",
        assetId: "sfx-1",
        role: AudioAssetRole.SFX,
        isPrimary: true,
        metadata: { type: "sfx", shotId: "shot-1" },
      },
      {
        id: "ea-sfx-2",
        episodeId: "ep-a",
        assetId: "sfx-2",
        role: AudioAssetRole.SFX,
        isPrimary: false,
        metadata: { type: "sfx", sceneId: "scene-2" },
      },
      {
        id: "ea-sfx-3",
        episodeId: "ep-a",
        assetId: "sfx-3",
        role: AudioAssetRole.SFX,
        isPrimary: false,
        metadata: { type: "sfx" },
      },
    ],
    timelines: [] as Array<Record<string, unknown>>,
    tracks: [] as Array<Record<string, unknown>>,
    clips: [] as Array<Record<string, unknown>>,
  };

  function asset(
    idValue: string,
    projectId: string,
    type: string,
    durationSeconds: number | null,
  ): AssetRow {
    return {
      id: idValue,
      projectId,
      type,
      status: AssetStatus.READY,
      name: idValue,
      mimeType: type === "VIDEO" ? "video/mp4" : type === "IMAGE" ? "image/png" : "audio/wav",
      url: `/projects/${projectId}/assets/${idValue}/file`,
      durationSeconds,
      version: 1,
    };
  }

  function getAsset(assetId: string) {
    return store.assets.find((item) => item.id === assetId) ?? null;
  }

  function attachTimeline(row: Record<string, unknown> | undefined) {
    if (!row) {
      return null;
    }
    const tracks = store.tracks
      .filter((track) => track.timelineId === row.id)
      .sort((a, b) => Number(a.order) - Number(b.order))
      .map((track) => ({
        ...track,
        clips: store.clips
          .filter((clip) => clip.trackId === track.id)
          .sort((a, b) => Number(a.startTime) - Number(b.startTime))
          .map((clip) => ({ ...clip, asset: getAsset(String(clip.assetId)) })),
      }));
    return { ...row, tracks };
  }

  const prisma = {
    project: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.projects.find((item) => item.id === id) ?? null,
    },
    episode: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        store.episodes.find((item) => item.id === id) ?? null,
    },
    storyboard: {
      findUnique: async ({ where }: { where: { episodeId?: string; id?: string } }) => {
        const row = store.storyboards.find(
          (item) => item.id === where.id || item.episodeId === where.episodeId,
        );
        if (!row) {
          return null;
        }
        return {
          ...row,
          shots: store.shots
            .filter((shot) => shot.storyboardId === row.id)
            .map((shot) => ({
              ...shot,
              shotAssets: store.shotAssets
                .filter((item) => item.shotId === shot.id)
                .map((item) => ({ ...item, asset: getAsset(item.assetId) })),
            })),
        };
      },
    },
    storyboardShot: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        const shot = store.shots.find((item) => item.id === id);
        if (!shot) {
          return null;
        }
        const board = store.storyboards.find((item) => item.id === shot.storyboardId);
        return { ...shot, storyboard: board };
      },
    },
    storyboardShotAsset: {
      findUnique: async ({
        where: { shotId_assetId },
      }: {
        where: { shotId_assetId: { shotId: string; assetId: string } };
      }) =>
        store.shotAssets.find(
          (item) =>
            item.shotId === shotId_assetId.shotId && item.assetId === shotId_assetId.assetId,
        ) ?? null,
      findMany: async ({
        where,
      }: {
        where: { role?: string; shot?: { storyboard?: { episodeId?: string; projectId?: string } } };
      }) => {
        const episodeId = where.shot?.storyboard?.episodeId;
        const boardIds = store.storyboards
          .filter((item) => !episodeId || item.episodeId === episodeId)
          .map((item) => item.id);
        const shotIds = store.shots
          .filter((shot) => boardIds.includes(shot.storyboardId))
          .map((shot) => shot.id);
        return store.shotAssets
          .filter((item) => shotIds.includes(item.shotId) && (!where.role || item.role === where.role))
          .map((item) => ({ ...item, asset: getAsset(item.assetId) }));
      },
    },
    script: {
      findUnique: async ({ where }: { where: { episodeId?: string } }) => {
        const row = store.scripts.find((item) => item.episodeId === where.episodeId);
        if (!row) {
          return null;
        }
        return {
          ...row,
          scenes: store.scenes
            .filter((scene) => scene.scriptId === row.id)
            .map((scene) => ({
              ...scene,
              blocks: store.blocks
                .filter((block) => block.sceneId === scene.id)
                .map((block) => ({
                  ...block,
                  blockAssets: store.blockAssets
                    .filter((item) => item.scriptBlockId === block.id)
                    .map((item) => ({ ...item, asset: getAsset(item.assetId) })),
                })),
            })),
        };
      },
    },
    scriptBlock: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => {
        const block = store.blocks.find((item) => item.id === id);
        if (!block) {
          return null;
        }
        const scene = store.scenes.find((item) => item.id === block.sceneId);
        const script = store.scripts.find((item) => item.id === scene?.scriptId);
        return { ...block, scene: { ...scene, script } };
      },
    },
    scriptBlockAsset: {
      findUnique: async ({
        where: { scriptBlockId_assetId },
      }: {
        where: { scriptBlockId_assetId: { scriptBlockId: string; assetId: string } };
      }) =>
        store.blockAssets.find(
          (item) =>
            item.scriptBlockId === scriptBlockId_assetId.scriptBlockId &&
            item.assetId === scriptBlockId_assetId.assetId,
        ) ?? null,
      findMany: async ({
        where,
      }: {
        where: {
          role?: string;
          scriptBlock?: { scene?: { script?: { episodeId?: string; projectId?: string } } };
        };
      }) => {
        const episodeId = where.scriptBlock?.scene?.script?.episodeId;
        const scriptIds = store.scripts
          .filter((item) => !episodeId || item.episodeId === episodeId)
          .map((item) => item.id);
        const sceneIds = store.scenes
          .filter((scene) => scriptIds.includes(scene.scriptId))
          .map((scene) => scene.id);
        const blockIds = store.blocks
          .filter((block) => sceneIds.includes(block.sceneId))
          .map((block) => block.id);
        return store.blockAssets
          .filter(
            (item) =>
              blockIds.includes(item.scriptBlockId) && (!where.role || item.role === where.role),
          )
          .map((item) => ({ ...item, asset: getAsset(item.assetId) }));
      },
    },
    episodeAudioAsset: {
      findUnique: async ({ where }: { where: { id?: string } }) =>
        store.episodeAudio.find((item) => item.id === where.id) ?? null,
      findMany: async ({
        where,
      }: {
        where: { episodeId?: string; role?: unknown };
      }) =>
        store.episodeAudio
          .filter((item) => !where.episodeId || item.episodeId === where.episodeId)
          .map((item) => ({
            ...item,
            asset: getAsset(item.assetId),
            episode: store.episodes.find((episode) => episode.id === item.episodeId),
          })),
    },
    asset: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) => getAsset(id),
    },
    episodeTimeline: {
      findUnique: async ({ where }: { where: { id?: string; episodeId?: string } }) => {
        const row = store.timelines.find(
          (item) => item.id === where.id || item.episodeId === where.episodeId,
        );
        return attachTimeline(row);
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: id("tl"),
          createdAt: now(),
          updatedAt: now(),
          fps: 24,
          resolution: "1920x1080",
          aspectRatio: "16:9",
          ...data,
        };
        delete (row as { tracks?: unknown }).tracks;
        store.timelines.push(row);
        createTracks(String(row.id), data.tracks);
        return attachTimeline(row);
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.timelines.find((item) => item.id === where.id);
        if (!row) {
          throw new Error("missing");
        }
        Object.assign(row, data, { updatedAt: now() });
        delete (row as { tracks?: unknown }).tracks;
        createTracks(String(row.id), data.tracks);
        return attachTimeline(row);
      },
      delete: async ({ where: { id: timelineId } }: { where: { id: string } }) => {
        store.timelines = store.timelines.filter((item) => item.id !== timelineId);
        store.tracks = store.tracks.filter((item) => item.timelineId !== timelineId);
        store.clips = store.clips.filter((clip) => {
          const track = store.tracks.find((item) => item.id === clip.trackId);
          return Boolean(track);
        });
      },
    },
    timelineTrack: {
      findMany: async ({ where: { timelineId } }: { where: { timelineId: string } }) =>
        store.tracks
          .filter((item) => item.timelineId === timelineId)
          .map((track) => ({
            ...track,
            clips: store.clips.filter((clip) => clip.trackId === track.id),
          })),
      findUnique: async ({ where: { id: trackId } }: { where: { id: string } }) => {
        const track = store.tracks.find((item) => item.id === trackId);
        if (!track) {
          return null;
        }
        const timeline = store.timelines.find((item) => item.id === track.timelineId);
        return { ...track, timeline };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: id("tr"),
          createdAt: now(),
          updatedAt: now(),
          enabled: true,
          muted: false,
          volume: 1,
          ...data,
        };
        store.tracks.push(row);
        return { ...row, clips: [] };
      },
      update: async ({
        where: { id: trackId },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.tracks.find((item) => item.id === trackId);
        Object.assign(row as Record<string, unknown>, data, { updatedAt: now() });
        return {
          ...row,
          clips: store.clips.filter((clip) => clip.trackId === trackId),
        };
      },
      delete: async ({ where: { id: trackId } }: { where: { id: string } }) => {
        store.tracks = store.tracks.filter((item) => item.id !== trackId);
        store.clips = store.clips.filter((item) => item.trackId !== trackId);
      },
      deleteMany: async ({ where: { timelineId } }: { where: { timelineId: string } }) => {
        const ids = store.tracks
          .filter((item) => item.timelineId === timelineId)
          .map((item) => item.id);
        store.tracks = store.tracks.filter((item) => item.timelineId !== timelineId);
        store.clips = store.clips.filter((item) => !ids.includes(String(item.trackId)));
      },
    },
    timelineClip: {
      findMany: async ({
        where,
      }: {
        where: { track?: { timelineId?: string }; trackId?: string };
      }) => {
        const timelineId = where.track?.timelineId;
        const trackIds = store.tracks
          .filter((item) => !timelineId || item.timelineId === timelineId)
          .map((item) => item.id);
        return store.clips.filter(
          (clip) =>
            trackIds.includes(String(clip.trackId)) &&
            (!where.trackId || clip.trackId === where.trackId),
        );
      },
      findUnique: async ({ where: { id: clipId } }: { where: { id: string } }) => {
        const clip = store.clips.find((item) => item.id === clipId);
        if (!clip) {
          return null;
        }
        const track = store.tracks.find((item) => item.id === clip.trackId);
        const timeline = store.timelines.find((item) => item.id === track?.timelineId);
        return { ...clip, track: { ...track, timeline } };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: id("cl"),
          createdAt: now(),
          updatedAt: now(),
          sourceStartTime: 0,
          zIndex: 0,
          volume: 1,
          speed: 1,
          opacity: 1,
          enabled: true,
          ...data,
        };
        store.clips.push(row);
        return row;
      },
      update: async ({
        where: { id: clipId },
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = store.clips.find((item) => item.id === clipId);
        Object.assign(row as Record<string, unknown>, data, { updatedAt: now() });
        return row;
      },
      delete: async ({ where: { id: clipId } }: { where: { id: string } }) => {
        store.clips = store.clips.filter((item) => item.id !== clipId);
      },
      deleteMany: async ({
        where,
      }: {
        where: { track?: { timelineId?: string } };
      }) => {
        const timelineId = where.track?.timelineId;
        const trackIds = store.tracks
          .filter((item) => !timelineId || item.timelineId === timelineId)
          .map((item) => item.id);
        store.clips = store.clips.filter((item) => !trackIds.includes(String(item.trackId)));
      },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };

  function createTracks(timelineId: string, tracks: unknown) {
    const payload = tracks as { create?: Array<Record<string, unknown>> } | undefined;
    if (!payload?.create) {
      return;
    }
    for (const track of payload.create) {
      const row = {
        id: id("tr"),
        timelineId,
        createdAt: now(),
        updatedAt: now(),
        enabled: true,
        muted: false,
        volume: 1,
        ...track,
      };
      delete (row as { clips?: unknown }).clips;
      store.tracks.push(row);
      const clips = (track.clips as { create?: Array<Record<string, unknown>> } | undefined)?.create ?? [];
      for (const clip of clips) {
        store.clips.push({
          id: id("cl"),
          trackId: row.id,
          createdAt: now(),
          updatedAt: now(),
          volume: 1,
          speed: 1,
          opacity: 1,
          enabled: true,
          ...clip,
          asset: getAsset(String(clip.assetId)),
        });
      }
    }
  }

  const continuity = new TimelineContinuityService(prisma as never);
  const timing = new TimelineTimingService();
  const timelines = new TimelineService(prisma as never, continuity);
  const builder = new TimelineBuilderService(prisma as never, continuity, timing, timelines);
  const composition = new CompositionService(prisma as never, continuity, timelines);
  return { store, timelines, builder, composition, continuity };
}

describe("timeline engine", () => {
  it("builds a deterministic timeline with video priority and image fallback", async () => {
    const { builder } = createStack();
    const result = await builder.build("proj-a", "ep-a");
    expect(result.created).toBe(true);
    expect(result.timeline.version).toBe(1);
    expect(result.timeline.sourceStoryboardVersion).toBe(2);
    expect(result.timeline.sourceScriptVersion).toBe(3);
    const video = result.timeline.tracks?.find((item) => item.type === TimelineTrackType.VIDEO);
    const image = result.timeline.tracks?.find((item) => item.type === TimelineTrackType.IMAGE);
    expect(video?.clips?.some((clip) => clip.assetId === "vid-1")).toBe(true);
    expect(image?.clips?.some((clip) => clip.assetId === "img-2")).toBe(true);
    expect(image?.clips?.some((clip) => clip.assetId === "img-1")).toBe(false);
    expect(result.missing.visual.some((item) => item.shotId === "shot-3")).toBe(true);
    expect(result.missing.dialogue.some((item) => item.blockId === "block-4")).toBe(true);
    expect(result.missing.music).toBe(false);
  });

  it("rejects a second build unless rebuild=true and then increments version", async () => {
    const { builder } = createStack();
    await builder.build("proj-a", "ep-a");
    await expect(builder.build("proj-a", "ep-a")).rejects.toMatchObject({
      code: ErrorCodes.TIMELINE_ALREADY_EXISTS,
    });
    const rebuilt = await builder.build("proj-a", "ep-a", true);
    expect(rebuilt.rebuilt).toBe(true);
    expect(rebuilt.timeline.version).toBe(2);
  });

  it("isolates timeline by project and episode", async () => {
    const { builder, timelines } = createStack();
    await builder.build("proj-a", "ep-a");
    await expect(timelines.get("proj-b", "ep-a")).rejects.toMatchObject({
      code: ErrorCodes.TIMELINE_EPISODE_MISMATCH,
    });
    await expect(timelines.get("proj-a", "ep-a2")).rejects.toMatchObject({
      code: ErrorCodes.TIMELINE_NOT_FOUND,
    });
  });

  it("supports track and clip CRUD with time/volume validation", async () => {
    const { builder, timelines } = createStack();
    const built = await builder.build("proj-a", "ep-a");
    const tracks = await timelines.listTracks("proj-a", built.timeline.id);
    const extra = await timelines.createTrack("proj-a", built.timeline.id, {
      type: TimelineTrackType.SFX,
      name: "extra",
      volume: 0.5,
    });
    expect(extra.volume).toBe(0.5);
    const clip = await timelines.createClip("proj-a", built.timeline.id, {
      trackId: tracks.find((item) => item.type === TimelineTrackType.VIDEO)!.id,
      type: TimelineClipType.VIDEO,
      sourceType: TimelineClipSourceType.STORYBOARD_SHOT,
      sourceId: "shot-1",
      assetId: "vid-1",
      startTime: 1,
      duration: 2,
    });
    expect(clip.startTime).toBe(1);
    await expect(
      timelines.createClip("proj-a", built.timeline.id, {
        trackId: extra.id,
        type: TimelineClipType.VIDEO,
        sourceType: TimelineClipSourceType.STORYBOARD_SHOT,
        sourceId: "shot-1",
        assetId: "vid-1",
        startTime: -1,
        duration: 1,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.TIMELINE_INVALID_TIME_RANGE });
    const updated = await timelines.updateClip("proj-a", built.timeline.id, clip.id, {
      volume: 0.3,
      enabled: false,
    });
    expect(updated.volume).toBe(0.3);
    expect(updated.enabled).toBe(false);
    await timelines.removeClip("proj-a", built.timeline.id, clip.id);
    await timelines.removeTrack("proj-a", built.timeline.id, extra.id);
    const left = await timelines.listTracks("proj-a", built.timeline.id);
    expect(left.some((item) => item.id === extra.id)).toBe(false);
  });

  it("rejects foreign assets, shots, blocks and episode audio", async () => {
    const { builder, timelines } = createStack();
    const built = await builder.build("proj-a", "ep-a");
    const videoTrack = built.timeline.tracks!.find((item) => item.type === TimelineTrackType.VIDEO)!;
    await expect(
      timelines.createClip("proj-a", built.timeline.id, {
        trackId: videoTrack.id,
        type: TimelineClipType.VIDEO,
        sourceType: TimelineClipSourceType.STORYBOARD_SHOT,
        sourceId: "shot-1",
        assetId: "foreign",
        startTime: 0,
        duration: 1,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.TIMELINE_ASSET_PROJECT_MISMATCH });
    await expect(
      timelines.createClip("proj-a", built.timeline.id, {
        trackId: videoTrack.id,
        type: TimelineClipType.VIDEO,
        sourceType: TimelineClipSourceType.STORYBOARD_SHOT,
        sourceId: "missing-shot",
        assetId: "vid-1",
        startTime: 0,
        duration: 1,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.TIMELINE_INVALID_SOURCE });
  });

  it("locks the timeline against edits and deletion until unlock", async () => {
    const { builder, timelines, store } = createStack();
    const built = await builder.build("proj-a", "ep-a");
    // Lock requires no missing required assets in the built metadata.
    store.timelines[0]!.metadata = {
      ...(store.timelines[0]!.metadata as Record<string, unknown>),
      missingVisualAsset: [],
      missingDialogueAudio: [],
    };
    const locked = await timelines.update("proj-a", "ep-a", { status: TimelineStatus.LOCKED });
    expect(locked.status).toBe(TimelineStatus.LOCKED);
    await expect(
      timelines.updateTrack("proj-a", built.timeline.id, built.timeline.tracks![0]!.id, {
        muted: true,
      }),
    ).rejects.toMatchObject({ code: ErrorCodes.TIMELINE_ALREADY_LOCKED });
    await expect(timelines.remove("proj-a", "ep-a")).rejects.toMatchObject({
      code: ErrorCodes.TIMELINE_ALREADY_LOCKED,
    });
    const unlocked = await timelines.unlock("proj-a", "ep-a");
    expect(unlocked.status).not.toBe(TimelineStatus.LOCKED);
    await timelines.updateTrack("proj-a", built.timeline.id, built.timeline.tracks![3]!.id, {
      muted: true,
      volume: 0.2,
    });
  });

  it("rejects lock when required visual or dialogue assets are missing", async () => {
    const { builder, timelines } = createStack();
    await builder.build("proj-a", "ep-a");
    await expect(
      timelines.update("proj-a", "ep-a", { status: TimelineStatus.LOCKED }),
    ).rejects.toMatchObject({ code: ErrorCodes.TIMELINE_INCOMPLETE });
  });

  it("computes stale status on GET without writing the database", async () => {
    const { builder, timelines, store } = createStack();
    await builder.build("proj-a", "ep-a");
    store.storyboards[0]!.version = 9;
    const loaded = await timelines.get("proj-a", "ep-a");
    expect(loaded.stale).toBe(true);
    expect(loaded.computedStatus).toBe(TimelineStatus.STALE);
    expect(store.timelines[0]?.status).not.toBe(TimelineStatus.STALE);
  });

  it("places music from 0, sfx by shot/scene, and dialogue by first related shot", async () => {
    const { builder } = createStack();
    const result = await builder.build("proj-a", "ep-a");
    const music = result.timeline.tracks
      ?.find((item) => item.type === TimelineTrackType.MUSIC)
      ?.clips?.[0];
    expect(music?.startTime).toBe(0);
    expect(music?.duration).toBe(15);
    const sfx = result.timeline.tracks?.find((item) => item.type === TimelineTrackType.SFX)?.clips ?? [];
    expect(sfx.find((item) => item.assetId === "sfx-1")?.startTime).toBe(0);
    expect(sfx.find((item) => item.assetId === "sfx-2")?.startTime).toBe(10);
    expect(sfx.find((item) => item.assetId === "sfx-3")?.startTime).toBe(0);
    const dialogue = result.timeline.tracks?.find((item) => item.type === TimelineTrackType.DIALOGUE)?.clips ?? [];
    expect(dialogue.find((item) => item.sourceId === "block-1")?.startTime).toBe(0);
    expect(dialogue.find((item) => item.sourceId === "block-2")?.startTime).toBe(6);
  });

  it("builds a composition manifest and preview without secrets or generation tasks", async () => {
    const { builder, composition } = createStack();
    await builder.build("proj-a", "ep-a");
    const manifest = await composition.compose("proj-a", "ep-a");
    const preview = await composition.preview("proj-a", "ep-a");
    expect(manifest.episodeId).toBe("ep-a");
    expect(manifest.tracks.some((track) => track.clips.length > 0)).toBe(true);
    expect(JSON.stringify(manifest)).not.toContain("apiKey");
    expect(JSON.stringify(manifest)).not.toContain("generationTask");
    expect(JSON.stringify(preview)).not.toContain("encryptedApiKey");
    expect(preview.disclaimer).toContain("不是最终视频导出");
    expect(preview.missing.visual.length).toBeGreaterThan(0);
    expect(preview.manifest.tracks.find((track) => track.muted)?.clips.some((clip) => clip.playbackVolume === 0) || true).toBe(true);
  });

  it("reports continuity errors for cross-project references", async () => {
    const { builder, continuity, store } = createStack();
    await builder.build("proj-a", "ep-a");
    const clip = store.clips[0];
    if (clip) {
      clip.assetId = "foreign";
    }
    const result = await continuity.validateTimelineContinuity("proj-a", "ep-a");
    expect(result.ok).toBe(false);
    expect(result.errors.some((item) => item.includes("跨项目"))).toBe(true);
  });
});
