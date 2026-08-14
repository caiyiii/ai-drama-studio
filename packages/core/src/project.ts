import {
  ProjectStatus,
  ProjectStep,
  type Project,
} from "@ai-drama-studio/types";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.DRAFT]: "草稿",
  [ProjectStatus.IN_PROGRESS]: "制作中",
  [ProjectStatus.COMPLETED]: "已完成",
  [ProjectStatus.ARCHIVED]: "已归档",
};

export const PROJECT_STEP_ORDER: ProjectStep[] = [
  ProjectStep.WORLD,
  ProjectStep.CHARACTERS,
  ProjectStep.LOCATIONS,
  ProjectStep.EPISODES,
  ProjectStep.SCRIPT,
  ProjectStep.STORYBOARD,
  ProjectStep.IMAGES,
  ProjectStep.VIDEOS,
  ProjectStep.VOICES,
  ProjectStep.RENDER,
];

export type ProductionStepState = "done" | "current" | "upcoming";

export function getProjectStatusLabel(status: ProjectStatus): string {
  return STATUS_LABELS[status];
}

export function getProjectProgressPercent(
  status: ProjectStatus,
  currentStep: ProjectStep | `${ProjectStep}`,
): number {
  if (status === ProjectStatus.COMPLETED) {
    return 100;
  }
  const index = PROJECT_STEP_ORDER.indexOf(currentStep as ProjectStep);
  if (index < 0) {
    return 0;
  }
  return (index + 1) * 10;
}

export function getStepProgressPercent(step: ProjectStep | `${ProjectStep}`): number {
  const index = PROJECT_STEP_ORDER.indexOf(step as ProjectStep);
  if (index < 0) {
    return 0;
  }
  return (index + 1) * 10;
}

export function getProductionStepState(
  project: Pick<Project, "status" | "currentStep">,
  step: ProjectStep | `${ProjectStep}`,
): ProductionStepState {
  if (project.status === ProjectStatus.COMPLETED) {
    return "done";
  }
  const currentIndex = PROJECT_STEP_ORDER.indexOf(project.currentStep);
  const stepIndex = PROJECT_STEP_ORDER.indexOf(step as ProjectStep);
  if (stepIndex < currentIndex) {
    return "done";
  }
  if (stepIndex === currentIndex) {
    return "current";
  }
  return "upcoming";
}

export function getProductionStepStateLabel(state: ProductionStepState): string {
  if (state === "done") {
    return "已完成";
  }
  if (state === "current") {
    return "进行中";
  }
  return "未开始";
}

export const PROJECT_STEP_DESCRIPTIONS: Record<ProjectStep, string> = {
  [ProjectStep.WORLD]: "定义时代、规则、阵营与故事宇宙。",
  [ProjectStep.CHARACTERS]: "建立角色档案、关系与外形设定。",
  [ProjectStep.LOCATIONS]: "管理故事发生的地点与空间氛围。",
  [ProjectStep.EPISODES]: "拆分剧集结构、场次与叙事节奏。",
  [ProjectStep.SCRIPT]: "撰写对白、旁白与场次剧本。",
  [ProjectStep.STORYBOARD]: "将剧本落成分镜序列。",
  [ProjectStep.IMAGES]: "生成角色、场景与关键帧图像。",
  [ProjectStep.VIDEOS]: "将分镜推进为动态镜头。",
  [ProjectStep.VOICES]: "为对白与旁白配置配音。",
  [ProjectStep.RENDER]: "合成成片并输出最终漫剧。",
};
