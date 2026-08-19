import {
  EpisodeProductionStep,
  type EpisodeNextStep,
  type EpisodeProductionInput,
  type EpisodeProductionState,
  type EpisodeProductionStepSummary,
} from "@ai-drama-studio/types";
import {
  isAudioComplete,
  isPlanReady,
  isScriptConfirmed,
  isStoryboardConfirmed,
  isTimelineLocked,
  isVisualsComplete,
  mapProductionStageToStep,
  resolveEpisodeNextAction,
  resolveEpisodeProductionProgress,
  resolveEpisodeProductionStage,
} from "./episode-production";

const STEP_META: Record<
  EpisodeProductionStep,
  { label: string; description: string; actionLabel: string }
> = {
  [EpisodeProductionStep.OVERVIEW]: {
    label: "剧集规划",
    description: "确认这一集讲什么。",
    actionLabel: "编辑剧集规划 →",
  },
  [EpisodeProductionStep.SCRIPT]: {
    label: "剧本",
    description: "整理场景、对白、动作与旁白。",
    actionLabel: "开始生成剧本 →",
  },
  [EpisodeProductionStep.STORYBOARD]: {
    label: "分镜",
    description: "把剧本拆成镜头与拍法。",
    actionLabel: "继续制作分镜 →",
  },
  [EpisodeProductionStep.VISUALS]: {
    label: "画面",
    description: "生成图片与视频素材。",
    actionLabel: "继续生成画面 →",
  },
  [EpisodeProductionStep.VOICE]: {
    label: "配音",
    description: "为对白生成语音素材。",
    actionLabel: "继续生成配音 →",
  },
  [EpisodeProductionStep.AUDIO]: {
    label: "音乐与音效",
    description: "补齐音乐与音效素材。",
    actionLabel: "继续生成声音 →",
  },
  [EpisodeProductionStep.TIMELINE]: {
    label: "时间线",
    description: "编排已经存在的素材。",
    actionLabel: "进入时间线 →",
  },
  [EpisodeProductionStep.RENDER]: {
    label: "成片",
    description: "把锁定时间线输出为 MP4。",
    actionLabel: "生成成片 →",
  },
  [EpisodeProductionStep.COMPLETE]: {
    label: "已完成",
    description: "这一集已经生成成片。",
    actionLabel: "查看成片 →",
  },
};

export function getEpisodeProductionProgress(
  input: EpisodeProductionInput,
): EpisodeProductionStepSummary[] {
  const progress = resolveEpisodeProductionProgress(input);
  return progress.map((item) => ({
    step: progressIdToStep(item.id),
    state: item.state,
    label: item.label,
    description: item.description,
  }));
}

export function getEpisodeNextStep(input: EpisodeProductionInput): EpisodeNextStep {
  const action = resolveEpisodeNextAction(input);
  const step = mapProductionStageToStep(resolveEpisodeProductionStage(input));
  return {
    step,
    label: action.label,
    description: action.description,
    actionLabel: `${action.label} →`,
  };
}

export function isEpisodeReadyForScript(input: EpisodeProductionInput): boolean {
  return isPlanReady(input);
}

export function isEpisodeReadyForStoryboard(input: EpisodeProductionInput): boolean {
  return isScriptConfirmed(input);
}

export function isEpisodeReadyForVisual(input: EpisodeProductionInput): boolean {
  return isStoryboardConfirmed(input);
}

export function isEpisodeReadyForVoice(input: EpisodeProductionInput): boolean {
  return isVisualsComplete(input);
}

export function isEpisodeReadyForAudio(input: EpisodeProductionInput): boolean {
  return isVisualsComplete(input);
}

export function isEpisodeReadyForTimeline(input: EpisodeProductionInput): boolean {
  return isAudioComplete(input);
}

export function isEpisodeReadyForRender(input: EpisodeProductionInput): boolean {
  return isTimelineLocked(input);
}

export function progressStateTone(state: EpisodeProductionState): string {
  if (state === "COMPLETED" || state === "LOCKED") return "text-emerald-300";
  if (state === "STALE") return "text-amber-200";
  if (state === "BLOCKED") return "text-zinc-500";
  if (state === "IN_PROGRESS") return "text-gold-300";
  if (state === "READY") return "text-sky-300";
  return "text-zinc-500";
}

function progressIdToStep(
  id: "PLAN" | "SCRIPT" | "STORYBOARD" | "VISUAL" | "AUDIO" | "TIMELINE" | "RENDER",
): EpisodeProductionStep {
  if (id === "PLAN") return EpisodeProductionStep.OVERVIEW;
  if (id === "SCRIPT") return EpisodeProductionStep.SCRIPT;
  if (id === "STORYBOARD") return EpisodeProductionStep.STORYBOARD;
  if (id === "VISUAL") return EpisodeProductionStep.VISUALS;
  if (id === "AUDIO") return EpisodeProductionStep.AUDIO;
  if (id === "TIMELINE") return EpisodeProductionStep.TIMELINE;
  return EpisodeProductionStep.RENDER;
}

export { STEP_META };
