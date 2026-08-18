import {
  GenerationTaskStatus,
  GenerationTaskType,
  type GenerationTask,
} from "@ai-drama-studio/types";

const TERMINAL_STATUSES: GenerationTaskStatus[] = [
  GenerationTaskStatus.SUCCEEDED,
  GenerationTaskStatus.FAILED,
  GenerationTaskStatus.CANCELLED,
];

export function isTaskTerminal(status: GenerationTaskStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isTaskInProgress(status: GenerationTaskStatus): boolean {
  return (
    status === GenerationTaskStatus.PENDING ||
    status === GenerationTaskStatus.RUNNING
  );
}

export function canRetryTask(task: Pick<GenerationTask, "status">): boolean {
  return task.status === GenerationTaskStatus.FAILED;
}

const STATUS_LABELS: Record<GenerationTaskStatus, string> = {
  [GenerationTaskStatus.PENDING]: "等待中",
  [GenerationTaskStatus.RUNNING]: "生成中",
  [GenerationTaskStatus.SUCCEEDED]: "已完成",
  [GenerationTaskStatus.FAILED]: "失败",
  [GenerationTaskStatus.CANCELLED]: "已取消",
};

export function getGenerationStatusLabel(status: GenerationTaskStatus): string {
  return STATUS_LABELS[status] ?? status;
}

const TYPE_LABELS: Record<GenerationTaskType, string> = {
  [GenerationTaskType.WORLD]: "世界观",
  [GenerationTaskType.CHARACTER]: "人物",
  [GenerationTaskType.STORY_BIBLE]: "故事圣经",
  [GenerationTaskType.SEASON_OUTLINE]: "季大纲",
  [GenerationTaskType.EPISODE_OUTLINE]: "剧集大纲",
  [GenerationTaskType.SCRIPT]: "剧本",
  [GenerationTaskType.IMAGE]: "图片",
  [GenerationTaskType.VIDEO]: "视频",
  [GenerationTaskType.IMAGE_TO_VIDEO]: "图生视频",
  [GenerationTaskType.VOICE]: "配音",
  [GenerationTaskType.TTS]: "语音",
  [GenerationTaskType.MUSIC]: "音乐",
  [GenerationTaskType.SFX]: "音效",
  [GenerationTaskType.STORYBOARD]: "分镜",
};

export function getGenerationTypeLabel(type: GenerationTaskType): string {
  return TYPE_LABELS[type] ?? type;
}

export function getGenerationDurationLabel(
  usage: GenerationTask["usage"] | null | undefined,
): string | null {
  const ms = usage?.durationMs;
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms < 0) {
    return null;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}
