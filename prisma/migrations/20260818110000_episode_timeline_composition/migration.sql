-- CreateEnum
CREATE TYPE "TimelineStatus" AS ENUM ('DRAFT', 'PREVIEW_READY', 'STALE', 'LOCKED');

-- CreateEnum
CREATE TYPE "TimelineTrackType" AS ENUM ('VIDEO', 'IMAGE', 'DIALOGUE', 'MUSIC', 'SFX');

-- CreateEnum
CREATE TYPE "TimelineClipType" AS ENUM ('VIDEO', 'IMAGE', 'AUDIO');

-- CreateEnum
CREATE TYPE "TimelineClipSourceType" AS ENUM ('STORYBOARD_SHOT', 'SCRIPT_BLOCK', 'EPISODE_AUDIO', 'ASSET');

-- CreateTable
CREATE TABLE "EpisodeTimeline" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "TimelineStatus" NOT NULL DEFAULT 'DRAFT',
    "durationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fps" INTEGER NOT NULL DEFAULT 24,
    "resolution" TEXT NOT NULL DEFAULT '1920x1080',
    "aspectRatio" TEXT NOT NULL DEFAULT '16:9',
    "sourceStoryboardVersion" INTEGER,
    "sourceScriptVersion" INTEGER,
    "sourceAssetVersionSummary" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EpisodeTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineTrack" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "type" "TimelineTrackType" NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineClip" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "type" "TimelineClipType" NOT NULL,
    "sourceType" "TimelineClipSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "sourceStartTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceDuration" DOUBLE PRECISION NOT NULL,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineClip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeTimeline_episodeId_key" ON "EpisodeTimeline"("episodeId");

-- CreateIndex
CREATE INDEX "EpisodeTimeline_projectId_idx" ON "EpisodeTimeline"("projectId");

-- CreateIndex
CREATE INDEX "TimelineTrack_timelineId_idx" ON "TimelineTrack"("timelineId");

-- CreateIndex
CREATE INDEX "TimelineClip_trackId_idx" ON "TimelineClip"("trackId");

-- CreateIndex
CREATE INDEX "TimelineClip_assetId_idx" ON "TimelineClip"("assetId");

-- CreateIndex
CREATE INDEX "TimelineClip_sourceType_sourceId_idx" ON "TimelineClip"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "EpisodeTimeline" ADD CONSTRAINT "EpisodeTimeline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeTimeline" ADD CONSTRAINT "EpisodeTimeline_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineTrack" ADD CONSTRAINT "TimelineTrack_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "EpisodeTimeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineClip" ADD CONSTRAINT "TimelineClip_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "TimelineTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineClip" ADD CONSTRAINT "TimelineClip_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
