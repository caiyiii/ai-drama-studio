import { WORKSPACE_NAV } from "@ai-drama-studio/config";
import { ProjectStep } from "@ai-drama-studio/types";

type WorkspaceNavItem = (typeof WORKSPACE_NAV)[number];
type ProductionNavItem = Exclude<WorkspaceNavItem, { step: null }>;

export function getWorkspaceSteps() {
  return WORKSPACE_NAV;
}

export function getProductionNavItems(): ProductionNavItem[] {
  return WORKSPACE_NAV.filter(
    (item): item is ProductionNavItem => item.step !== null,
  );
}

export function getWorkspacePath(projectId: string, stepPath = ""): string {
  const suffix = stepPath ? `/${stepPath}` : "";
  return `/projects/${projectId}${suffix}`;
}

export function getProjectStepPath(step: ProjectStep): string {
  const item = WORKSPACE_NAV.find((entry) => entry.step === step);
  return item?.path ?? "";
}

export function getContinueProductionPath(
  projectId: string,
  step: ProjectStep,
): string {
  return getWorkspacePath(projectId, getProjectStepPath(step));
}

export function getProjectStepLabel(step: ProjectStep): string {
  const item = WORKSPACE_NAV.find((entry) => entry.step === step);
  return item?.label ?? step;
}
