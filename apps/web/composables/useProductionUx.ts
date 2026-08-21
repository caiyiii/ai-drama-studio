import {
  EpisodeNextActionType,
  type EpisodeNextAction,
  type EpisodeOverview,
  type EpisodeProductionProgressItem,
  type EpisodeProductionState,
} from "@ai-drama-studio/types";
import { episodeModulePath, type EpisodeProductionModule } from "~/composables/useEpisodeProduction";

/** User-facing production steps (Timeline is engine-only). */
export type UserProductionStep =
  | "outline"
  | "script"
  | "storyboard"
  | "visual"
  | "audio"
  | "render";

export interface UserStepItem {
  id: UserProductionStep;
  label: string;
  module: EpisodeProductionModule;
  state: EpisodeProductionState;
  mark: string;
}

const NEXT_ACTION_UI: Record<
  EpisodeNextActionType,
  { label: string; description: string; step: UserProductionStep }
> = {
  [EpisodeNextActionType.EDIT_PLAN]: {
    label: "✨ AI生成大纲",
    description: "先确认这一集讲什么。",
    step: "outline",
  },
  [EpisodeNextActionType.GENERATE_SCRIPT]: {
    label: "✨ AI生成剧本",
    description: "根据大纲生成可执行剧本。",
    step: "script",
  },
  [EpisodeNextActionType.CONFIRM_SCRIPT]: {
    label: "确认剧本",
    description: "确认后才能继续生成分镜。",
    step: "script",
  },
  [EpisodeNextActionType.GENERATE_STORYBOARD]: {
    label: "✨ AI生成分镜",
    description: "把剧本拆成镜头。",
    step: "storyboard",
  },
  [EpisodeNextActionType.CONFIRM_STORYBOARD]: {
    label: "确认分镜",
    description: "确认后开始生成画面。",
    step: "storyboard",
  },
  [EpisodeNextActionType.GENERATE_MISSING_VISUAL_ASSETS]: {
    label: "✨ AI生成画面",
    description: "为本集镜头生成画面。",
    step: "visual",
  },
  [EpisodeNextActionType.GENERATE_MISSING_AUDIO_ASSETS]: {
    label: "✨ AI生成配音",
    description: "为对白生成配音。",
    step: "audio",
  },
  [EpisodeNextActionType.OPEN_TIMELINE]: {
    label: "✨ AI生成成片",
    description: "画面和配音已齐，可以生成成片。",
    step: "render",
  },
  [EpisodeNextActionType.LOCK_TIMELINE]: {
    label: "✨ AI生成成片",
    description: "系统会整理素材并生成成片。",
    step: "render",
  },
  [EpisodeNextActionType.RENDER_EPISODE]: {
    label: "✨ AI生成成片",
    description: "输出本集 MP4。",
    step: "render",
  },
  [EpisodeNextActionType.VIEW_RENDER_JOB]: {
    label: "查看成片进度",
    description: "成片正在生成中。",
    step: "render",
  },
  [EpisodeNextActionType.RETRY_RENDER]: {
    label: "重试生成成片",
    description: "上次成片未成功，可以重试。",
    step: "render",
  },
  [EpisodeNextActionType.VIEW_EPISODE]: {
    label: "查看成片",
    description: "本集成片已生成。",
    step: "render",
  },
};

function progressById(
  progress: EpisodeProductionProgressItem[],
  id: EpisodeProductionProgressItem["id"],
): EpisodeProductionProgressItem | undefined {
  return progress.find((item) => item.id === id);
}

function stepMark(state: EpisodeProductionState): string {
  if (state === "COMPLETED" || state === "LOCKED") return "✓";
  if (state === "STALE" || state === "BLOCKED") return "!";
  if (state === "IN_PROGRESS" || state === "READY") return "●";
  return "○";
}

export function mapNextActionToUi(action: EpisodeNextAction) {
  const mapped = NEXT_ACTION_UI[action.type];
  return {
    type: action.type,
    label: mapped?.label ?? action.label,
    description: mapped?.description ?? action.description,
    reason: action.reason,
    step: mapped?.step ?? ("outline" as UserProductionStep),
  };
}

export function resolveUserProductionSteps(
  overview: EpisodeOverview,
): UserStepItem[] {
  const p = overview.progress;
  const plan = progressById(p, "PLAN");
  const script = progressById(p, "SCRIPT");
  const storyboard = progressById(p, "STORYBOARD");
  const visual = progressById(p, "VISUAL");
  const audio = progressById(p, "AUDIO");
  const render = progressById(p, "RENDER");
  const timeline = progressById(p, "TIMELINE");

  let renderState: EpisodeProductionState = render?.state ?? "NOT_STARTED";
  if (
    renderState === "BLOCKED" &&
    visual?.state === "COMPLETED" &&
    audio?.state === "COMPLETED" &&
    timeline &&
    timeline.state !== "LOCKED" &&
    timeline.state !== "COMPLETED"
  ) {
    renderState = "READY";
  }

  const rows: Array<Omit<UserStepItem, "mark">> = [
    {
      id: "outline",
      label: "大纲",
      module: "plan",
      state: plan?.state ?? "NOT_STARTED",
    },
    {
      id: "script",
      label: "剧本",
      module: "script",
      state: script?.state ?? "NOT_STARTED",
    },
    {
      id: "storyboard",
      label: "分镜",
      module: "storyboard",
      state: storyboard?.state ?? "NOT_STARTED",
    },
    {
      id: "visual",
      label: "画面",
      module: "assets",
      state: visual?.state ?? "NOT_STARTED",
    },
    {
      id: "audio",
      label: "配音",
      module: "assets",
      state: audio?.state ?? "NOT_STARTED",
    },
    {
      id: "render",
      label: "成片",
      module: "render",
      state: renderState,
    },
  ];

  return rows.map((row) => ({ ...row, mark: stepMark(row.state) }));
}

export function userStepPath(
  projectId: string,
  episodeId: string,
  step: UserProductionStep,
  seasonId?: string | null,
  focus?: "visual" | "audio",
) {
  const module: EpisodeProductionModule =
    step === "outline"
      ? "plan"
      : step === "script"
        ? "script"
        : step === "storyboard"
          ? "storyboard"
          : step === "visual" || step === "audio"
            ? "assets"
            : step === "render"
              ? "render"
              : "workspace";
  const base = episodeModulePath(projectId, episodeId, module, seasonId);
  if (step === "visual") return `${base}?focus=visual`;
  if (step === "audio") return `${base}?focus=audio`;
  if (focus) return `${base}?focus=${focus}`;
  return base;
}

export function nextActionPath(
  projectId: string,
  episodeId: string,
  action: EpisodeNextAction,
  seasonId?: string | null,
) {
  const ui = mapNextActionToUi(action);
  return userStepPath(projectId, episodeId, ui.step, seasonId);
}

export function visualReadyLabel(overview: EpisodeOverview) {
  const total = overview.storyboard.shotCount || 0;
  const ready = Math.max(total - overview.missing.visual.length, 0);
  return { ready, total, label: `${ready} / ${total}` };
}

export function audioReadyLabel(overview: EpisodeOverview) {
  const total = overview.assets.voices.total || 0;
  const ready = overview.assets.voices.ready || 0;
  return { ready, total, label: `${ready} / ${total}` };
}
