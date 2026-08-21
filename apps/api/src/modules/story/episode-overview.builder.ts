import {
  detectTimelineStale,
  mapProductionStageToStep,
  resolveEpisodeNextAction,
  resolveEpisodeProductionChecklist,
  resolveEpisodeProductionProgress,
  resolveEpisodeProductionStage,
  resolveEpisodeReadiness,
} from "@ai-drama-studio/core";
import type { Episode, EpisodeOverview, EpisodeProductionInput, Season } from "@ai-drama-studio/types";
import { mapRenderJob } from "../render/render.mapper";

type ShotRow = {
  id: string;
  shotNumber: number;
  sceneId?: string | null;
  shotAssets?: Array<{ isPrimary: boolean; asset?: { type: string } | null }>;
};

type BlockRow = {
  id: string;
  type: string;
  assets?: Array<{ isPrimary: boolean; asset?: { type: string } | null }>;
  blockAssets?: Array<{ isPrimary: boolean; asset?: { type: string } | null }>;
};

type GenerationRow = {
  id: string;
  type: string;
  status: string;
  createdAt: Date;
};

export function generationActivityLabel(type: string, status: string): string {
  const name =
    type === "SCRIPT"
      ? "剧本"
      : type === "STORYBOARD"
        ? "分镜"
        : type === "IMAGE"
          ? "图片"
          : type === "VIDEO" || type === "IMAGE_TO_VIDEO"
            ? "视频"
            : type === "TTS"
              ? "对白配音"
              : type === "MUSIC"
                ? "音乐"
                : type === "SFX"
                  ? "音效"
                  : type;
  if (status === "FAILED") return `${name}生成失败`;
  if (status === "SUCCEEDED") return `${name}生成完成`;
  if (status === "RUNNING") return `${name}生成中`;
  return `${name}任务 ${status}`;
}

export function renderActivityLabel(status: string): string {
  if (status === "SUCCEEDED") return "Render 成功";
  if (status === "FAILED") return "Render 失败";
  if (status === "LOCKED" || status === "RENDERING") return "Render 进行中";
  return `Render ${status}`;
}

export function buildEpisodeOverview(params: {
  season: Pick<Season, "id" | "number" | "title" | "status">;
  episode: Episode;
  plan: EpisodeOverview["plan"] extends infer T ? Omit<Extract<T, object>, "exists" | "status"> & { ready: boolean } : never;
  script: {
    status: string;
    version: number;
    scenes: Array<{ blocks?: BlockRow[] }>;
  } | null;
  storyboard: {
    status: string;
    version: number;
    sourceScriptVersion?: number | null;
    shots: ShotRow[];
  } | null;
  timeline: {
    status: string;
    version: number;
    durationSeconds: number | null;
    sourceStoryboardVersion?: number | null;
    sourceScriptVersion?: number | null;
  } | null;
  musicAssets: Array<{ isPrimary: boolean }>;
  sfxAssets: Array<{ isPrimary: boolean }>;
  renderJobs: Array<Parameters<typeof mapRenderJob>[0]>;
  generationTasks: GenerationRow[];
}): EpisodeOverview {
  type ScriptProgress = NonNullable<EpisodeProductionInput["script"]>;
  type StoryboardProgress = NonNullable<EpisodeProductionInput["storyboard"]>;
  type TimelineProgress = NonNullable<EpisodeProductionInput["timeline"]>;
  type RenderProgress = NonNullable<EpisodeProductionInput["render"]>;
  const shots = params.storyboard?.shots ?? [];
  const missingVisual: Array<{ shotId: string; shotNumber?: number }> = [];
  let imageReady = 0;
  let videoReady = 0;
  let visualReady = 0;
  for (const shot of shots) {
    const hasImage = (shot.shotAssets ?? []).some(
      (item) => item.isPrimary && item.asset?.type === "IMAGE",
    );
    const hasVideo = (shot.shotAssets ?? []).some(
      (item) => item.isPrimary && item.asset?.type === "VIDEO",
    );
    if (hasImage) imageReady += 1;
    if (hasVideo) videoReady += 1;
    if (hasImage || hasVideo) visualReady += 1;
    else missingVisual.push({ shotId: shot.id, shotNumber: shot.shotNumber });
  }
  const dialogueBlocks = (params.script?.scenes ?? []).flatMap((scene) =>
    (scene.blocks ?? []).filter((block) => block.type === "DIALOGUE"),
  );
  const missingDialogue: Array<{ blockId: string; blockIndex?: number }> = [];
  let dialogueReady = 0;
  dialogueBlocks.forEach((block, index) => {
    const relations = block.blockAssets ?? block.assets ?? [];
    const hasAudio = relations.some(
      (item) => item.isPrimary && item.asset?.type === "AUDIO",
    );
    if (hasAudio) dialogueReady += 1;
    else missingDialogue.push({ blockId: block.id, blockIndex: index + 1 });
  });
  const musicReadyCount =
    params.musicAssets.filter((item) => item.isPrimary).length || params.musicAssets.length;
  const sfxReadyCount =
    params.sfxAssets.filter((item) => item.isPrimary).length || params.sfxAssets.length;
  const storyboardStale = Boolean(
    params.storyboard &&
      params.script &&
      typeof params.storyboard.sourceScriptVersion === "number" &&
      params.storyboard.sourceScriptVersion !== params.script.version,
  );
  const timelineStale = params.timeline
    ? detectTimelineStale({
        sourceStoryboardVersion: params.timeline.sourceStoryboardVersion,
        sourceScriptVersion: params.timeline.sourceScriptVersion,
        currentStoryboardVersion: params.storyboard?.version,
        currentScriptVersion: params.script?.version,
      })
    : false;
  const mappedJobs = params.renderJobs.map((job) => mapRenderJob(job));
  const latestJob = mappedJobs[0] ?? null;
  const latestArtifact = latestJob?.artifact ?? null;
  const productionInput: EpisodeProductionInput = {
    episode: { id: params.episode.id, status: params.episode.status },
    plan: { ready: params.plan.ready },
    script: params.script
      ? {
          status: params.script.status as unknown as ScriptProgress["status"],
          sceneCount: params.script.scenes.length,
          exists: true,
        }
      : null,
    storyboard: params.storyboard
      ? {
          status: params.storyboard.status as unknown as StoryboardProgress["status"],
          shotCount: shots.length,
          stale: storyboardStale,
          exists: true,
        }
      : null,
    visuals: {
      shotCount: shots.length,
      imageReadyCount: imageReady,
      videoReadyCount: videoReady,
      visualReadyCount: visualReady,
      missingCount: missingVisual.length,
      missingRequired: missingVisual.length > 0,
      missing: missingVisual,
    },
    voice: {
      dialogueTotal: dialogueBlocks.length,
      dialogueReadyCount: dialogueReady,
      missingRequired: missingDialogue.length > 0,
      missing: missingDialogue,
    },
    audio: {
      musicReady: musicReadyCount > 0,
      sfxReady: sfxReadyCount > 0,
      musicExpected: 0,
      musicReadyCount,
      sfxExpected: 0,
      sfxReadyCount,
    },
    timeline: params.timeline
      ? {
          status: params.timeline.status as unknown as TimelineProgress["status"],
          computedStatus: (timelineStale
            ? "STALE"
            : params.timeline.status) as unknown as TimelineProgress["computedStatus"],
          stale: timelineStale,
          exists: true,
          version: params.timeline.version,
          durationSeconds: params.timeline.durationSeconds ?? undefined,
        }
      : null,
    render: latestJob
      ? { status: latestJob.status as unknown as RenderProgress["status"] }
      : null,
  };
  const productionStage = resolveEpisodeProductionStage(productionInput);
  return {
    season: params.season,
    episode: params.episode,
    productionStage,
    productionStep: mapProductionStageToStep(productionStage),
    nextAction: resolveEpisodeNextAction(productionInput),
    plan: {
      exists: params.plan.ready,
      status: params.plan.ready ? "READY" : "MISSING",
      ...params.plan,
    },
    script: {
      exists: Boolean(params.script),
      status: (params.script?.status as EpisodeOverview["script"]["status"]) ?? null,
      version: params.script?.version ?? null,
      sceneCount: params.script?.scenes.length ?? 0,
    },
    storyboard: {
      exists: Boolean(params.storyboard),
      status: (params.storyboard?.status as EpisodeOverview["storyboard"]["status"]) ?? null,
      version: params.storyboard?.version ?? null,
      sceneCount: new Set(shots.map((shot) => shot.sceneId).filter(Boolean)).size,
      shotCount: shots.length,
      stale: storyboardStale,
    },
    assets: {
      images: { total: shots.length, ready: imageReady, missing: Math.max(shots.length - imageReady, 0) },
      videos: { total: shots.length, ready: videoReady, missing: Math.max(shots.length - videoReady, 0) },
      voices: { total: dialogueBlocks.length, ready: dialogueReady, missing: missingDialogue.length },
      music: { total: 1, ready: musicReadyCount > 0 ? 1 : 0, missing: musicReadyCount > 0 ? 0 : 1 },
      sfx: {
        total: Math.max(sfxReadyCount, 0),
        ready: sfxReadyCount,
        missing: 0,
      },
    },
    missing: { visual: missingVisual, dialogue: missingDialogue },
    timeline: {
      exists: Boolean(params.timeline),
      status: (params.timeline?.status as EpisodeOverview["timeline"]["status"]) ?? null,
      version: params.timeline?.version ?? null,
      durationSeconds: params.timeline?.durationSeconds ?? null,
      stale: timelineStale,
    },
    render: {
      latestJob: latestJob
        ? {
            id: latestJob.id,
            status: latestJob.status,
            progress: latestJob.progress,
            timelineVersion: latestJob.timelineVersion,
            createdAt: latestJob.createdAt,
            errorMessage: latestJob.errorMessage,
          }
        : null,
      latestArtifact: latestArtifact
        ? {
            id: latestArtifact.id,
            url: latestArtifact.url,
            durationSeconds: latestArtifact.durationSeconds,
            width: latestArtifact.width,
            height: latestArtifact.height,
            fps: latestArtifact.fps,
            fileSize: latestArtifact.fileSize,
          }
        : null,
      status: latestJob?.status ?? null,
      history: mappedJobs.map((job) => ({
        id: job.id,
        status: job.status,
        timelineVersion: job.timelineVersion,
        createdAt: job.createdAt,
        hasArtifact: Boolean(job.artifact),
      })),
    },
    progress: resolveEpisodeProductionProgress(productionInput),
    checklist: resolveEpisodeProductionChecklist(productionInput),
    readiness: resolveEpisodeReadiness(productionInput),
    activity: [
      ...params.generationTasks.map((task) => ({
        id: task.id,
        kind: "GENERATION" as const,
        type: String(task.type),
        status: String(task.status),
        label: generationActivityLabel(String(task.type), String(task.status)),
        createdAt: task.createdAt.toISOString(),
      })),
      ...mappedJobs.slice(0, 3).map((job) => ({
        id: job.id,
        kind: "RENDER" as const,
        type: "RENDER",
        status: job.status,
        label: renderActivityLabel(String(job.status)),
        createdAt: job.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8),
  };
}
