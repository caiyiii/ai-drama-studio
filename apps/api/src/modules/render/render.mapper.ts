import {
  RenderArtifactType,
  RenderJobStage,
  RenderJobStatus,
  type RenderArtifact,
  type RenderJob,
} from "@ai-drama-studio/types";
import type { Prisma } from "@prisma/client";

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function mapRenderArtifact(row: {
  id: string;
  projectId: string;
  episodeId: string;
  renderJobId: string;
  type: string;
  mimeType: string;
  fileSize: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  createdAt: Date;
  updatedAt: Date;
}): RenderArtifact {
  return {
    id: row.id,
    projectId: row.projectId,
    episodeId: row.episodeId,
    renderJobId: row.renderJobId,
    type: row.type as RenderArtifactType,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    durationSeconds: row.durationSeconds,
    width: row.width,
    height: row.height,
    fps: row.fps,
    url: `/projects/${row.projectId}/render-artifacts/${row.id}/file`,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapRenderJob(
  row: {
    id: string;
    projectId: string;
    episodeId: string;
    timelineId: string;
    timelineVersion: number;
    status: string;
    progress: number | null;
    currentStage: string;
    attempt: number;
    maxAttempts: number;
    outputFormat: string;
    outputContainer: string;
    width: number;
    height: number;
    fps: number;
    durationSeconds: number;
    outputArtifactId: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    failedAt: Date | null;
    artifacts?: Parameters<typeof mapRenderArtifact>[0][];
  },
  artifact?: ReturnType<typeof mapRenderArtifact> | null,
): RenderJob {
  const mappedArtifact =
    artifact ??
    (row.artifacts?.length
      ? mapRenderArtifact(
          row.artifacts.find((item) => item.id === row.outputArtifactId) || row.artifacts[0],
        )
      : null);
  return {
    id: row.id,
    projectId: row.projectId,
    episodeId: row.episodeId,
    timelineId: row.timelineId,
    timelineVersion: row.timelineVersion,
    status: row.status as RenderJobStatus,
    progress: row.progress,
    currentStage: row.currentStage as RenderJobStage,
    attempt: row.attempt,
    maxAttempts: row.maxAttempts,
    outputFormat: row.outputFormat,
    outputContainer: row.outputContainer,
    width: row.width,
    height: row.height,
    fps: row.fps,
    durationSeconds: row.durationSeconds,
    outputArtifactId: row.outputArtifactId,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    startedAt: iso(row.startedAt),
    completedAt: iso(row.completedAt),
    cancelledAt: iso(row.cancelledAt),
    failedAt: iso(row.failedAt),
    artifact: mappedArtifact,
  };
}

export function jsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
