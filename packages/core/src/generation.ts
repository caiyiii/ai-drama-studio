import {
  GenerationTaskStatus,
  type GenerationTask,
} from "@ai-drama-studio/types";

const TERMINAL_STATUSES: GenerationTaskStatus[] = [
  GenerationTaskStatus.SUCCESS,
  GenerationTaskStatus.FAILED,
  GenerationTaskStatus.CANCELLED,
];

export function isTaskTerminal(status: GenerationTaskStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isTaskInProgress(status: GenerationTaskStatus): boolean {
  return (
    status === GenerationTaskStatus.PENDING ||
    status === GenerationTaskStatus.PROCESSING
  );
}

export function canRetryTask(task: Pick<GenerationTask, "status">): boolean {
  return task.status === GenerationTaskStatus.FAILED;
}
