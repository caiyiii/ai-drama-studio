-- AlterEnum
ALTER TYPE "GenerationTaskType" ADD VALUE 'MUSIC';
ALTER TYPE "GenerationTaskType" ADD VALUE 'SFX';

-- AlterEnum
ALTER TYPE "AiCapability" ADD VALUE 'SFX';

-- CreateEnum
CREATE TYPE "AudioAssetRole" AS ENUM ('MUSIC', 'SFX', 'REFERENCE', 'FINAL');

-- CreateTable
CREATE TABLE "EpisodeAudioAsset" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" "AudioAssetRole" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpisodeAudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EpisodeAudioAsset_episodeId_idx" ON "EpisodeAudioAsset"("episodeId");

-- CreateIndex
CREATE INDEX "EpisodeAudioAsset_assetId_idx" ON "EpisodeAudioAsset"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeAudioAsset_episodeId_assetId_key" ON "EpisodeAudioAsset"("episodeId", "assetId");

-- AddForeignKey
ALTER TABLE "EpisodeAudioAsset" ADD CONSTRAINT "EpisodeAudioAsset_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeAudioAsset" ADD CONSTRAINT "EpisodeAudioAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
