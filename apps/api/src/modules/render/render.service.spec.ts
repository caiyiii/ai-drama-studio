import { describe, expect, it } from "vitest";
import { TimelineStatus } from "@prisma/client";
import { RenderJobStatus } from "@ai-drama-studio/types";
import { ErrorCodes } from "../../common/app-error";
import { emptyMissingAssets } from "@ai-drama-studio/core";
import { RenderService } from "./render.service";
import { mapRenderJob } from "./render.mapper";

function now() {
  return new Date("2026-08-18T00:00:00.000Z");
}

function createService() {
  const jobs: Array<Record<string, unknown>> = [];
  const events: Array<Record<string, unknown>> = [];
  let seq = 1;
  const timeline = {
    id: "tl-1",
    projectId: "proj-a",
    episodeId: "ep-a",
    version: 5,
    status: TimelineStatus.LOCKED,
    durationSeconds: 4,
    fps: 24,
    resolution: "640x360",
    aspectRatio: "16:9",
    metadata: { missing: emptyMissingAssets() },
    createdAt: now(),
    updatedAt: now(),
  };
  const snapshot = {
    episodeId: "ep-a",
    projectId: "proj-a",
    timelineId: "tl-1",
    version: 5,
    status: "LOCKED",
    durationSeconds: 4,
    fps: 24,
    resolution: "640x360",
    aspectRatio: "16:9",
    missing: emptyMissingAssets(),
    assets: [],
    tracks: [
      {
        id: "tr-1",
        type: "IMAGE",
        name: "IMAGE",
        order: 0,
        enabled: true,
        muted: false,
        volume: 1,
        clips: [
          {
            id: "c1",
            type: "IMAGE",
            assetId: "img-1",
            enabled: true,
            startTime: 0,
            duration: 4,
          },
        ],
      },
    ],
  };

  const prisma = {
    project: {
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        id === "proj-a" || id === "proj-b" ? { id } : null,
    },
    episodeTimeline: {
      findUnique: async ({ where }: { where: { episodeId?: string } }) =>
        where.episodeId === "ep-a" ? timeline : null,
    },
    renderJob: {
      findFirst: async ({ where }: { where: { status?: { in: string[] }; timelineVersion?: number } }) => {
        return (
          jobs.find(
            (job) =>
              job.timelineVersion === (where.timelineVersion ?? job.timelineVersion) &&
              (!where.status?.in || where.status.in.includes(String(job.status))),
          ) || null
        );
      },
      findUnique: async ({ where: { id } }: { where: { id: string } }) =>
        jobs.find((job) => job.id === id) || null,
      findUniqueOrThrow: async ({ where: { id } }: { where: { id: string } }) => {
        const row = jobs.find((job) => job.id === id);
        if (!row) throw new Error("missing");
        return row;
      },
      findMany: async ({ where }: { where: { projectId: string; episodeId?: string } }) =>
        jobs.filter(
          (job) => job.projectId === where.projectId && (!where.episodeId || job.episodeId === where.episodeId),
        ),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          ...data,
          id: `job-${seq++}`,
          artifacts: [],
          createdAt: now(),
          updatedAt: now(),
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          failedAt: null,
          outputArtifactId: null,
          errorCode: null,
          errorMessage: null,
        };
        jobs.push(row);
        return row;
      },
      update: async ({ where: { id }, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = jobs.find((job) => job.id === id)!;
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; status?: unknown };
        data: Record<string, unknown>;
      }) => {
        const row = jobs.find((job) => job.id === where.id);
        if (!row) return { count: 0 };
        if (where.status && row.status !== where.status) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    renderJobEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        events.push(data);
        return data;
      },
    },
    $transaction: async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
  };

  const continuity = {
    ensureEpisode: async (projectId: string, episodeId: string) => {
      if (projectId !== "proj-a" || episodeId !== "ep-a") {
        const error = Object.assign(new Error("mismatch"), { code: ErrorCodes.RENDER_EPISODE_MISMATCH });
        throw error;
      }
    },
  };
  const timelines = {
    withComputedStatus: async () => ({
      ...timeline,
      stale: timeline.status === TimelineStatus.STALE,
      computedStatus: timeline.status,
    }),
  };
  const manifests = {
    createSnapshot: async () => structuredClone(snapshot),
  };
  const ffmpeg = { cancel: async () => true };

  const service = new RenderService(
    prisma as never,
    continuity as never,
    timelines as never,
    manifests as never,
    ffmpeg as never,
  );
  return { service, jobs, events, timeline, snapshot, prisma };
}

describe("RenderService", () => {
  it("rejects draft, preview and stale timelines and does not auto-lock", async () => {
    const stack = createService();
    stack.timeline.status = TimelineStatus.DRAFT;
    await expect(stack.service.create("proj-a", "ep-a")).rejects.toMatchObject({
      code: ErrorCodes.RENDER_TIMELINE_NOT_LOCKED,
    });
    stack.timeline.status = TimelineStatus.PREVIEW_READY;
    await expect(stack.service.create("proj-a", "ep-a")).rejects.toMatchObject({
      code: ErrorCodes.RENDER_TIMELINE_NOT_LOCKED,
    });
    const staleStack = createService();
    staleStack.timeline.status = TimelineStatus.LOCKED;
    (staleStack.service as unknown as { timelines: { withComputedStatus: () => Promise<unknown> } }).timelines = {
      withComputedStatus: async () => ({
        ...staleStack.timeline,
        stale: true,
        computedStatus: TimelineStatus.STALE,
      }),
    };
    await expect(staleStack.service.create("proj-a", "ep-a")).rejects.toMatchObject({
      code: ErrorCodes.RENDER_TIMELINE_STALE,
    });
    expect(staleStack.timeline.status).toBe(TimelineStatus.LOCKED);
  });

  it("creates a queued job with immutable snapshot and reuses an in-flight job", async () => {
    const { service, jobs, snapshot } = createService();
    const created = await service.create("proj-a", "ep-a");
    expect(created.status).toBe(RenderJobStatus.QUEUED);
    expect(created.timelineVersion).toBe(5);
    expect(created.progress).toBe(0);
    expect(JSON.stringify(created)).not.toContain("apiKey");
    expect(JSON.stringify(created)).not.toContain("manifestSnapshot");
    expect(jobs[0].manifestSnapshot).toMatchObject({ version: 5, timelineId: "tl-1" });
    const again = await service.create("proj-a", "ep-a");
    expect(again.id).toBe(created.id);
    expect(jobs).toHaveLength(1);
    snapshot.version = 99;
    expect((jobs[0].manifestSnapshot as { version: number }).version).toBe(5);
  });

  it("rejects render when required assets are missing", async () => {
    const stack = createService();
    (
      stack.service as unknown as {
        manifests: { createSnapshot: () => Promise<unknown> };
      }
    ).manifests = {
      createSnapshot: async () => ({
        ...stack.snapshot,
        missing: { visual: [{ shotId: "shot-1" }], dialogue: [{ blockId: "b1" }], music: false, sfx: false },
      }),
    };
    await expect(stack.service.create("proj-a", "ep-a")).rejects.toMatchObject({
      code: ErrorCodes.RENDER_MISSING_REQUIRED_ASSET,
    });
  });

  it("retries a failed job with the original snapshot", async () => {
    const { service, jobs } = createService();
    const created = await service.create("proj-a", "ep-a");
    jobs[0].status = RenderJobStatus.FAILED;
    jobs[0].manifestSnapshot = { ...jobs[0].manifestSnapshot as object, frozen: true };
    const retried = await service.retry("proj-a", created.id);
    expect(retried.id).not.toBe(created.id);
    expect(retried.timelineVersion).toBe(5);
    expect((jobs[1].manifestSnapshot as { frozen?: boolean }).frozen).toBe(true);
    await expect(service.retry("proj-a", retried.id)).rejects.toMatchObject({
      code: ErrorCodes.RENDER_RETRY_NOT_ALLOWED,
    });
  });

  it("cancels queued jobs and rejects cross-project access", async () => {
    const { service, jobs } = createService();
    const created = await service.create("proj-a", "ep-a");
    const cancelled = await service.cancel("proj-a", created.id);
    expect(cancelled.status).toBe(RenderJobStatus.CANCELLED);
    expect(jobs[0].status).toBe(RenderJobStatus.CANCELLED);
    await expect(service.get("proj-b", created.id)).rejects.toMatchObject({
      code: ErrorCodes.RENDER_PROJECT_MISMATCH,
    });
  });

  it("maps jobs without filesystem paths", () => {
    const mapped = mapRenderJob({
      id: "job-1",
      projectId: "proj-a",
      episodeId: "ep-a",
      timelineId: "tl-1",
      timelineVersion: 5,
      status: "SUCCEEDED",
      progress: 100,
      currentStage: "COMPLETED",
      attempt: 1,
      maxAttempts: 3,
      outputFormat: "h264_aac",
      outputContainer: "mp4",
      width: 640,
      height: 360,
      fps: 24,
      durationSeconds: 4,
      outputArtifactId: "art-1",
      errorCode: null,
      errorMessage: null,
      createdAt: now(),
      startedAt: now(),
      completedAt: now(),
      cancelledAt: null,
      failedAt: null,
      artifacts: [
        {
          id: "art-1",
          projectId: "proj-a",
          episodeId: "ep-a",
          renderJobId: "job-1",
          type: "EPISODE_VIDEO",
          mimeType: "video/mp4",
          fileSize: 1234,
          durationSeconds: 4,
          width: 640,
          height: 360,
          fps: 24,
          createdAt: now(),
          updatedAt: now(),
        },
      ],
    });
    expect(mapped.artifact?.url).toBe("/projects/proj-a/render-artifacts/art-1/file");
    expect(JSON.stringify(mapped)).not.toMatch(/[A-Za-z]:\\/);
    expect(JSON.stringify(mapped)).not.toContain("tmp/render");
    expect(JSON.stringify(mapped)).not.toContain("encryptedApiKey");
  });
});
