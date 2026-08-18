-- CreateEnum
CREATE TYPE "RenderJobStatus" AS ENUM ('QUEUED', 'PREPARING', 'RENDERING', 'SUCCEEDED', 'FAILED', 'CANCEL_REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RenderJobStage" AS ENUM ('QUEUED', 'PREPARING', 'ENCODING_VIDEO', 'MIXING_AUDIO', 'FINALIZING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RenderJobEventType" AS ENUM ('QUEUED', 'PREPARING', 'FFMPEG_STARTED', 'FFMPEG_PROGRESS', 'FFMPEG_COMPLETED', 'ARTIFACT_CREATED', 'SUCCEEDED', 'FAILED', 'CANCEL_REQUESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RenderArtifactType" AS ENUM ('EPISODE_VIDEO');

-- CreateTable
CREATE TABLE "RenderJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "timelineVersion" INTEGER NOT NULL,
    "status" "RenderJobStatus" NOT NULL DEFAULT 'QUEUED',
    "manifestSnapshot" JSONB NOT NULL,
    "outputFormat" TEXT NOT NULL DEFAULT 'h264_aac',
    "outputContainer" TEXT NOT NULL DEFAULT 'mp4',
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fps" INTEGER NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "progress" DOUBLE PRECISION,
    "currentStage" "RenderJobStage" NOT NULL DEFAULT 'QUEUED',
    "outputArtifactId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenderJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderJobEvent" (
    "id" TEXT NOT NULL,
    "renderJobId" TEXT NOT NULL,
    "type" "RenderJobEventType" NOT NULL,
    "message" TEXT,
    "progress" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenderJobEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenderArtifact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "renderJobId" TEXT NOT NULL,
    "type" "RenderArtifactType" NOT NULL DEFAULT 'EPISODE_VIDEO',
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'video/mp4',
    "fileSize" INTEGER NOT NULL,
    "durationSeconds" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "fps" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenderArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RenderJob_projectId_idx" ON "RenderJob"("projectId");

-- CreateIndex
CREATE INDEX "RenderJob_episodeId_idx" ON "RenderJob"("episodeId");

-- CreateIndex
CREATE INDEX "RenderJob_timelineId_idx" ON "RenderJob"("timelineId");

-- CreateIndex
CREATE INDEX "RenderJob_status_idx" ON "RenderJob"("status");

-- CreateIndex
CREATE INDEX "RenderJob_createdAt_idx" ON "RenderJob"("createdAt");

-- CreateIndex
CREATE INDEX "RenderJob_projectId_episodeId_timelineId_timelineVersion_idx" ON "RenderJob"("projectId", "episodeId", "timelineId", "timelineVersion");

-- CreateIndex
CREATE INDEX "RenderJobEvent_renderJobId_idx" ON "RenderJobEvent"("renderJobId");

-- CreateIndex
CREATE INDEX "RenderArtifact_renderJobId_idx" ON "RenderArtifact"("renderJobId");

-- CreateIndex
CREATE INDEX "RenderArtifact_projectId_idx" ON "RenderArtifact"("projectId");

-- CreateIndex
CREATE INDEX "RenderArtifact_episodeId_idx" ON "RenderArtifact"("episodeId");

-- AddForeignKey
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "EpisodeTimeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderJobEvent" ADD CONSTRAINT "RenderJobEvent_renderJobId_fkey" FOREIGN KEY ("renderJobId") REFERENCES "RenderJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderArtifact" ADD CONSTRAINT "RenderArtifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderArtifact" ADD CONSTRAINT "RenderArtifact_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderArtifact" ADD CONSTRAINT "RenderArtifact_renderJobId_fkey" FOREIGN KEY ("renderJobId") REFERENCES "RenderJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
