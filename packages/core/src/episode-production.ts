import {
  EpisodeNextActionType,
  EpisodeProductionStage,
  EpisodeProductionStep,
  RenderJobStatus,
  ScriptStatus,
  StoryboardStatus,
  TimelineStatus,
  type EpisodeNextAction,
  type EpisodeProductionChecklistItem,
  type EpisodeProductionInput,
  type EpisodeProductionProgressItem,
  type EpisodeProductionState,
  type EpisodeReadiness,
} from "@ai-drama-studio/types";

const STAGE_ORDER: EpisodeProductionStage[] = [
  EpisodeProductionStage.PLANNING,
  EpisodeProductionStage.SCRIPTING,
  EpisodeProductionStage.STORYBOARDING,
  EpisodeProductionStage.VISUAL_ASSETS,
  EpisodeProductionStage.AUDIO_ASSETS,
  EpisodeProductionStage.COMPOSING,
  EpisodeProductionStage.READY_TO_RENDER,
  EpisodeProductionStage.RENDERING,
  EpisodeProductionStage.COMPLETED,
];

const ACTION_META: Record<
  EpisodeNextActionType,
  { label: string; description: string }
> = {
  [EpisodeNextActionType.EDIT_PLAN]: {
    label: "编辑剧集规划",
    description: "先明确这一集讲什么，再进入剧本。",
  },
  [EpisodeNextActionType.GENERATE_SCRIPT]: {
    label: "生成剧本",
    description: "根据本集规划生成 Script，先 Preview 再 Apply。",
  },
  [EpisodeNextActionType.CONFIRM_SCRIPT]: {
    label: "确认剧本",
    description: "确认剧本后才能生成正式分镜。",
  },
  [EpisodeNextActionType.GENERATE_STORYBOARD]: {
    label: "生成分镜",
    description: "把已确认的剧本拆成镜头。",
  },
  [EpisodeNextActionType.CONFIRM_STORYBOARD]: {
    label: "确认分镜",
    description: "确认分镜后开始生成视觉素材。",
  },
  [EpisodeNextActionType.GENERATE_MISSING_VISUAL_ASSETS]: {
    label: "生成缺失视觉素材",
    description: "按 Shot 补齐图片或视频，仍走 Preview → Apply。",
  },
  [EpisodeNextActionType.GENERATE_MISSING_AUDIO_ASSETS]: {
    label: "生成缺失音频素材",
    description: "补齐对白配音、音乐或音效。",
  },
  [EpisodeNextActionType.OPEN_TIMELINE]: {
    label: "进入合成",
    description: "用已有素材构建时间线，不会自动调用 AI。",
  },
  [EpisodeNextActionType.LOCK_TIMELINE]: {
    label: "锁定时间线",
    description: "锁定后才能渲染成片。",
  },
  [EpisodeNextActionType.RENDER_EPISODE]: {
    label: "Render Episode",
    description: "把已锁定时间线输出为 Episode MP4。",
  },
  [EpisodeNextActionType.VIEW_RENDER_JOB]: {
    label: "查看成片任务",
    description: "当前正在渲染，请等待任务完成。",
  },
  [EpisodeNextActionType.RETRY_RENDER]: {
    label: "重试渲染",
    description: "上一次成片失败，可以在检查时间线后重试。",
  },
  [EpisodeNextActionType.VIEW_EPISODE]: {
    label: "查看成片",
    description: "这一集已经生成 Episode MP4。",
  },
};

export function isPlanReady(input: EpisodeProductionInput): boolean {
  if (input.plan?.ready) {
    return true;
  }
  return Boolean(input.script);
}

export function isScriptConfirmed(input: EpisodeProductionInput): boolean {
  const status = input.script?.status;
  return Boolean(
    input.script &&
      (status === ScriptStatus.READY || status === ScriptStatus.LOCKED),
  );
}

export function isStoryboardConfirmed(input: EpisodeProductionInput): boolean {
  const status = input.storyboard?.status;
  return Boolean(
    input.storyboard &&
      (status === StoryboardStatus.READY || status === StoryboardStatus.LOCKED) &&
      (input.storyboard.shotCount ?? 0) > 0 &&
      !input.storyboard.stale,
  );
}

export function isVisualsComplete(input: EpisodeProductionInput): boolean {
  const visuals = input.visuals;
  if (!visuals || visuals.missingRequired) {
    return false;
  }
  const shotCount = visuals.shotCount ?? 0;
  const ready =
    visuals.visualReadyCount ??
    Math.max(visuals.imageReadyCount ?? 0, visuals.videoReadyCount ?? 0);
  const missing =
    visuals.missingCount ??
    visuals.missing?.length ??
    (shotCount > 0 ? Math.max(shotCount - ready, 0) : 0);
  if (shotCount > 0) {
    return missing === 0 && ready > 0;
  }
  return (visuals.imageReadyCount ?? 0) + (visuals.videoReadyCount ?? 0) > 0;
}

export function isAudioComplete(input: EpisodeProductionInput): boolean {
  const voice = input.voice;
  const audio = input.audio;
  if (!voice && !audio) {
    return false;
  }
  if (voice?.missingRequired) {
    return false;
  }
  const dialogueTotal = voice?.dialogueTotal;
  const dialogueReady = voice?.dialogueReadyCount ?? 0;
  const dialogueDone =
    dialogueTotal && dialogueTotal > 0
      ? dialogueReady >= dialogueTotal && (voice?.missing?.length ?? 0) === 0
      : dialogueReady > 0 || dialogueTotal === 0;
  const musicExpected = audio?.musicExpected ?? 1;
  const musicReady =
    Boolean(audio?.musicReady) || (audio?.musicReadyCount ?? 0) > 0;
  const musicDone = musicExpected <= 0 ? true : musicReady;
  const sfxExpected = audio?.sfxExpected ?? 0;
  const sfxReady = Boolean(audio?.sfxReady) || (audio?.sfxReadyCount ?? 0) > 0;
  const sfxDone = sfxExpected <= 0 ? true : sfxReady;
  return Boolean(dialogueDone && musicDone && sfxDone);
}

export function isTimelineLocked(input: EpisodeProductionInput): boolean {
  const status = input.timeline?.computedStatus || input.timeline?.status;
  return Boolean(
    input.timeline &&
      status === TimelineStatus.LOCKED &&
      !input.timeline.stale,
  );
}

export function isRenderRunning(input: EpisodeProductionInput): boolean {
  const status = input.render?.status;
  return (
    status === RenderJobStatus.QUEUED ||
    status === RenderJobStatus.PREPARING ||
    status === RenderJobStatus.RENDERING ||
    status === RenderJobStatus.CANCEL_REQUESTED
  );
}

export function isRenderSucceeded(input: EpisodeProductionInput): boolean {
  return input.render?.status === RenderJobStatus.SUCCEEDED;
}

export function resolveEpisodeProductionStage(
  input: EpisodeProductionInput,
): EpisodeProductionStage {
  if (isRenderSucceeded(input)) {
    return EpisodeProductionStage.COMPLETED;
  }
  if (isRenderRunning(input)) {
    return EpisodeProductionStage.RENDERING;
  }
  if (!isPlanReady(input)) {
    return EpisodeProductionStage.PLANNING;
  }
  if (!isScriptConfirmed(input)) {
    return EpisodeProductionStage.SCRIPTING;
  }
  if (!isStoryboardConfirmed(input)) {
    return EpisodeProductionStage.STORYBOARDING;
  }
  if (!isVisualsComplete(input)) {
    return EpisodeProductionStage.VISUAL_ASSETS;
  }
  if (!isAudioComplete(input)) {
    return EpisodeProductionStage.AUDIO_ASSETS;
  }
  if (isTimelineLocked(input)) {
    return EpisodeProductionStage.READY_TO_RENDER;
  }
  return EpisodeProductionStage.COMPOSING;
}

export function resolveEpisodeNextAction(
  input: EpisodeProductionInput,
): EpisodeNextAction {
  const stage = resolveEpisodeProductionStage(input);
  const type = resolveActionType(input, stage);
  const meta = ACTION_META[type];
  return {
    type,
    label: meta.label,
    description: meta.description,
    reason: actionReason(input, type),
  };
}

export function resolveEpisodeProductionProgress(
  input: EpisodeProductionInput,
): EpisodeProductionProgressItem[] {
  const stage = resolveEpisodeProductionStage(input);
  return [
    {
      id: "PLAN",
      label: "剧集规划",
      description: "这一集讲什么。",
      state: progressState(isPlanReady(input), stage === EpisodeProductionStage.PLANNING),
    },
    {
      id: "SCRIPT",
      label: "剧本",
      description: "这一集具体怎么讲。",
      state: progressState(
        isScriptConfirmed(input),
        stage === EpisodeProductionStage.SCRIPTING,
        Boolean(input.script) && !isScriptConfirmed(input),
      ),
    },
    {
      id: "STORYBOARD",
      label: "分镜",
      description: "这一集具体怎么拍。",
      state: storyboardProgressState(input, stage),
    },
    {
      id: "VISUAL",
      label: "视觉素材",
      description: "按镜头生成图片 / 视频。",
      state: assetProgressState(
        isVisualsComplete(input),
        stage === EpisodeProductionStage.VISUAL_ASSETS,
        (input.visuals?.visualReadyCount ?? input.visuals?.imageReadyCount ?? 0) > 0,
        !isStoryboardConfirmed(input),
      ),
    },
    {
      id: "AUDIO",
      label: "音频素材",
      description: "对白、音乐与音效。",
      state: assetProgressState(
        isAudioComplete(input),
        stage === EpisodeProductionStage.AUDIO_ASSETS,
        (input.voice?.dialogueReadyCount ?? 0) > 0 || Boolean(input.audio?.musicReady),
        !isVisualsComplete(input),
      ),
    },
    {
      id: "TIMELINE",
      label: "合成",
      description: "编排已经存在的素材。",
      state: timelineProgressState(input, stage),
    },
    {
      id: "RENDER",
      label: "成片",
      description: "输出 Episode MP4。",
      state: renderProgressState(input, stage),
    },
  ];
}

export function resolveEpisodeReadiness(
  input: EpisodeProductionInput,
): EpisodeReadiness {
  const missingVisual = input.visuals?.missing ?? [];
  const missingDialogue = input.voice?.missing ?? [];
  const storyboardStale = Boolean(
    input.storyboard?.stale || input.storyboard?.status === StoryboardStatus.STALE,
  );
  const timelineStale = Boolean(
    input.timeline?.stale ||
      input.timeline?.computedStatus === TimelineStatus.STALE ||
      input.timeline?.status === TimelineStatus.STALE,
  );
  const visualMissing =
    (input.visuals?.missingCount ?? missingVisual.length) > 0 ||
    Boolean(input.visuals?.missingRequired);
  const dialogueMissing =
    missingDialogue.length > 0 || Boolean(input.voice?.missingRequired);
  let renderBlockedReason: string | null = null;
  if (!input.timeline) {
    renderBlockedReason = "尚未创建时间线。";
  } else if (timelineStale) {
    renderBlockedReason = "时间线已过期，请重新构建或检查时间线。";
  } else if (!isTimelineLocked(input)) {
    renderBlockedReason = "Timeline 尚未锁定。";
  } else if (visualMissing) {
    const shot = missingVisual[0];
    renderBlockedReason = shot?.shotNumber
      ? `Shot ${String(shot.shotNumber).padStart(3, "0")} 缺少视频或图片素材。`
      : "存在缺失的视觉素材。";
  } else if (dialogueMissing) {
    const block = missingDialogue[0];
    renderBlockedReason = block?.blockIndex
      ? `ScriptBlock ${String(block.blockIndex).padStart(2, "0")} 缺少对白音频。`
      : "存在缺失的对白音频。";
  }
  return {
    canGenerateScript: isPlanReady(input),
    canConfirmScript: Boolean(input.script) && !isScriptConfirmed(input),
    canGenerateStoryboard: isScriptConfirmed(input),
    canConfirmStoryboard:
      Boolean(input.storyboard) &&
      !isStoryboardConfirmed(input) &&
      isScriptConfirmed(input),
    canComposeTimeline: isVisualsComplete(input) && isAudioComplete(input),
    canLockTimeline: Boolean(input.timeline) && !timelineStale && !isTimelineLocked(input),
    canRender: isTimelineLocked(input) && !visualMissing && !dialogueMissing,
    renderBlockedReason,
    missingVisual,
    missingDialogue,
    stale: {
      storyboard: storyboardStale,
      timeline: timelineStale,
    },
  };
}

export function resolveEpisodeProductionChecklist(
  input: EpisodeProductionInput,
): EpisodeProductionChecklistItem[] {
  const visuals = input.visuals;
  const voice = input.voice;
  const audio = input.audio;
  const shotCount = visuals?.shotCount ?? 0;
  const visualReady =
    visuals?.visualReadyCount ??
    Math.max(visuals?.imageReadyCount ?? 0, visuals?.videoReadyCount ?? 0);
  const dialogueTotal = voice?.dialogueTotal ?? 0;
  const dialogueReady = voice?.dialogueReadyCount ?? 0;
  const musicReady = Boolean(audio?.musicReady) || (audio?.musicReadyCount ?? 0) > 0;
  const sfxReady = Boolean(audio?.sfxReady) || (audio?.sfxReadyCount ?? 0) > 0;
  return [
    { id: "plan", label: "Episode Plan", done: isPlanReady(input) },
    { id: "script", label: "Script", done: isScriptConfirmed(input) },
    { id: "storyboard", label: "Storyboard", done: isStoryboardConfirmed(input) },
    {
      id: "visuals",
      label: "Visual Assets",
      done: isVisualsComplete(input),
      detail: shotCount > 0 ? `${visualReady} / ${shotCount}` : undefined,
    },
    {
      id: "dialogue",
      label: "Dialogue",
      done: dialogueTotal > 0 ? dialogueReady >= dialogueTotal : dialogueReady > 0,
      detail: dialogueTotal > 0 ? `${dialogueReady} / ${dialogueTotal}` : undefined,
    },
    {
      id: "music",
      label: "Music",
      done: musicReady,
      detail: `${audio?.musicReadyCount ?? (musicReady ? 1 : 0)} / ${audio?.musicExpected ?? 1}`,
    },
    {
      id: "sfx",
      label: "SFX",
      done: (audio?.sfxExpected ?? 0) <= 0 ? sfxReady || isAudioComplete(input) : sfxReady,
      detail: `${audio?.sfxReadyCount ?? (sfxReady ? 1 : 0)} / ${audio?.sfxExpected ?? 0}`,
    },
    { id: "timeline", label: "Timeline", done: Boolean(input.timeline) },
    { id: "timelineLocked", label: "Timeline Locked", done: isTimelineLocked(input) },
    { id: "render", label: "Render", done: isRenderSucceeded(input) },
  ];
}

export function mapProductionStageToStep(
  stage: EpisodeProductionStage,
): EpisodeProductionStep {
  if (stage === EpisodeProductionStage.PLANNING) return EpisodeProductionStep.OVERVIEW;
  if (stage === EpisodeProductionStage.SCRIPTING) return EpisodeProductionStep.SCRIPT;
  if (stage === EpisodeProductionStage.STORYBOARDING) return EpisodeProductionStep.STORYBOARD;
  if (stage === EpisodeProductionStage.VISUAL_ASSETS) return EpisodeProductionStep.VISUALS;
  if (stage === EpisodeProductionStage.AUDIO_ASSETS) return EpisodeProductionStep.AUDIO;
  if (stage === EpisodeProductionStage.COMPOSING) return EpisodeProductionStep.TIMELINE;
  if (stage === EpisodeProductionStage.COMPLETED) return EpisodeProductionStep.COMPLETE;
  return EpisodeProductionStep.RENDER;
}

export function resolveEpisodeNextActionRoute(
  type: EpisodeNextActionType,
): "plan" | "script" | "storyboard" | "assets" | "timeline" | "render" | "workspace" {
  if (type === EpisodeNextActionType.EDIT_PLAN) return "plan";
  if (
    type === EpisodeNextActionType.GENERATE_SCRIPT ||
    type === EpisodeNextActionType.CONFIRM_SCRIPT
  ) {
    return "script";
  }
  if (
    type === EpisodeNextActionType.GENERATE_STORYBOARD ||
    type === EpisodeNextActionType.CONFIRM_STORYBOARD
  ) {
    return "storyboard";
  }
  if (
    type === EpisodeNextActionType.GENERATE_MISSING_VISUAL_ASSETS ||
    type === EpisodeNextActionType.GENERATE_MISSING_AUDIO_ASSETS
  ) {
    return "assets";
  }
  if (
    type === EpisodeNextActionType.OPEN_TIMELINE ||
    type === EpisodeNextActionType.LOCK_TIMELINE
  ) {
    return "timeline";
  }
  if (
    type === EpisodeNextActionType.RENDER_EPISODE ||
    type === EpisodeNextActionType.VIEW_RENDER_JOB ||
    type === EpisodeNextActionType.RETRY_RENDER ||
    type === EpisodeNextActionType.VIEW_EPISODE
  ) {
    return "render";
  }
  return "workspace";
}

export function getEpisodeProductionStageLabel(stage: EpisodeProductionStage): string {
  if (stage === EpisodeProductionStage.PLANNING) return "剧集规划";
  if (stage === EpisodeProductionStage.SCRIPTING) return "剧本";
  if (stage === EpisodeProductionStage.STORYBOARDING) return "分镜";
  if (stage === EpisodeProductionStage.VISUAL_ASSETS) return "视觉素材";
  if (stage === EpisodeProductionStage.AUDIO_ASSETS) return "音频素材";
  if (stage === EpisodeProductionStage.COMPOSING) return "合成";
  if (stage === EpisodeProductionStage.READY_TO_RENDER) return "待成片";
  if (stage === EpisodeProductionStage.RENDERING) return "成片生成中";
  return "已完成";
}

function resolveActionType(
  input: EpisodeProductionInput,
  stage: EpisodeProductionStage,
): EpisodeNextActionType {
  if (stage === EpisodeProductionStage.PLANNING) {
    return EpisodeNextActionType.EDIT_PLAN;
  }
  if (stage === EpisodeProductionStage.SCRIPTING) {
    return input.script
      ? EpisodeNextActionType.CONFIRM_SCRIPT
      : EpisodeNextActionType.GENERATE_SCRIPT;
  }
  if (stage === EpisodeProductionStage.STORYBOARDING) {
    return input.storyboard && (input.storyboard.shotCount ?? 0) > 0
      ? EpisodeNextActionType.CONFIRM_STORYBOARD
      : EpisodeNextActionType.GENERATE_STORYBOARD;
  }
  if (stage === EpisodeProductionStage.VISUAL_ASSETS) {
    return EpisodeNextActionType.GENERATE_MISSING_VISUAL_ASSETS;
  }
  if (stage === EpisodeProductionStage.AUDIO_ASSETS) {
    return EpisodeNextActionType.GENERATE_MISSING_AUDIO_ASSETS;
  }
  if (stage === EpisodeProductionStage.COMPOSING) {
    if (input.timeline && !input.timeline.stale) {
      return EpisodeNextActionType.LOCK_TIMELINE;
    }
    return EpisodeNextActionType.OPEN_TIMELINE;
  }
  if (stage === EpisodeProductionStage.READY_TO_RENDER) {
    return input.render?.status === RenderJobStatus.FAILED
      ? EpisodeNextActionType.RETRY_RENDER
      : EpisodeNextActionType.RENDER_EPISODE;
  }
  if (stage === EpisodeProductionStage.RENDERING) {
    return EpisodeNextActionType.VIEW_RENDER_JOB;
  }
  return EpisodeNextActionType.VIEW_EPISODE;
}

function actionReason(
  input: EpisodeProductionInput,
  type: EpisodeNextActionType,
): string | undefined {
  if (type === EpisodeNextActionType.GENERATE_STORYBOARD && !isScriptConfirmed(input)) {
    return "请先确认剧本。";
  }
  if (type === EpisodeNextActionType.RENDER_EPISODE) {
    return resolveEpisodeReadiness(input).renderBlockedReason ?? undefined;
  }
  if (type === EpisodeNextActionType.LOCK_TIMELINE && input.timeline?.stale) {
    return "上游内容发生变化，当前时间线需要重新检查。";
  }
  return undefined;
}

function progressState(
  done: boolean,
  current: boolean,
  inProgress = false,
): EpisodeProductionState {
  if (done) return "COMPLETED";
  if (current || inProgress) return "IN_PROGRESS";
  return "NOT_STARTED";
}

function storyboardProgressState(
  input: EpisodeProductionInput,
  stage: EpisodeProductionStage,
): EpisodeProductionState {
  if (input.storyboard?.stale || input.storyboard?.status === StoryboardStatus.STALE) {
    return "STALE";
  }
  if (isStoryboardConfirmed(input)) return "COMPLETED";
  if (!isScriptConfirmed(input)) return "BLOCKED";
  if (stage === EpisodeProductionStage.STORYBOARDING || Boolean(input.storyboard)) {
    return "IN_PROGRESS";
  }
  return "NOT_STARTED";
}

function assetProgressState(
  done: boolean,
  current: boolean,
  started: boolean,
  blocked: boolean,
): EpisodeProductionState {
  if (done) return "COMPLETED";
  if (blocked) return "BLOCKED";
  if (current || started) return "IN_PROGRESS";
  return "NOT_STARTED";
}

function timelineProgressState(
  input: EpisodeProductionInput,
  stage: EpisodeProductionStage,
): EpisodeProductionState {
  if (isTimelineLocked(input)) return "LOCKED";
  if (
    input.timeline?.stale ||
    input.timeline?.computedStatus === TimelineStatus.STALE ||
    input.timeline?.status === TimelineStatus.STALE
  ) {
    return "STALE";
  }
  if (input.timeline) {
    return stage === EpisodeProductionStage.COMPOSING ? "IN_PROGRESS" : "READY";
  }
  if (!isAudioComplete(input) || !isVisualsComplete(input)) return "BLOCKED";
  return stage === EpisodeProductionStage.COMPOSING ? "IN_PROGRESS" : "NOT_STARTED";
}

function renderProgressState(
  input: EpisodeProductionInput,
  stage: EpisodeProductionStage,
): EpisodeProductionState {
  if (isRenderSucceeded(input)) return "COMPLETED";
  if (isRenderRunning(input)) return "IN_PROGRESS";
  if (!isTimelineLocked(input) || resolveEpisodeReadiness(input).renderBlockedReason) {
    return "BLOCKED";
  }
  return stage === EpisodeProductionStage.READY_TO_RENDER ? "READY" : "NOT_STARTED";
}

export const EPISODE_PRODUCTION_STAGE_ORDER = STAGE_ORDER;
