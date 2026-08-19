import { LEGACY_PROJECT_PRODUCTION_PATHS, WORKSPACE_NAV } from "@ai-drama-studio/config";
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
  if (
    step === ProjectStep.SCRIPT ||
    step === ProjectStep.STORYBOARD ||
    step === ProjectStep.RENDER
  ) {
    return "episodes";
  }
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
  if (step === ProjectStep.SCRIPT) return "剧集工作台";
  if (step === ProjectStep.STORYBOARD) return "剧集工作台";
  if (step === ProjectStep.RENDER) return "剧集工作台";
  const item = WORKSPACE_NAV.find((entry) => entry.step === step);
  return item?.label ?? step;
}

export function isLegacyProjectProductionPath(path: string): boolean {
  return (LEGACY_PROJECT_PRODUCTION_PATHS as readonly string[]).includes(path);
}

export function resolveLegacyProductionRedirect(
  projectId: string,
  page: string,
  episodeId?: string | null,
): string | null {
  if (!isLegacyProjectProductionPath(page)) {
    return null;
  }
  if (episodeId) {
    return `/projects/${projectId}/episodes/${episodeId}/${page}`;
  }
  return `/projects/${projectId}/episodes`;
}
