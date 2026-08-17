import {
  GenerationTaskStatus,
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
