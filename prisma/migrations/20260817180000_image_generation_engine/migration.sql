-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "StoryboardShotAssetRole" AS ENUM ('REFERENCE', 'GENERATED', 'FINAL', 'THUMBNAIL');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "status" "AssetStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "storageKey" TEXT,
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "width" INTEGER,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "durationSeconds" DOUBLE PRECISION,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "generationTaskId" TEXT;

-- CreateIndex
CREATE INDEX "Asset_projectId_idx" ON "Asset"("projectId");

-- CreateIndex
CREATE INDEX "Asset_generationTaskId_idx" ON "Asset"("generationTaskId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_generationTaskId_fkey" FOREIGN KEY ("generationTaskId") REFERENCES "GenerationTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "StoryboardShotAsset" (
    "id" TEXT NOT NULL,
    "shotId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" "StoryboardShotAssetRole" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryboardShotAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryboardShotAsset_shotId_assetId_key" ON "StoryboardShotAsset"("shotId", "assetId");

-- CreateIndex
CREATE INDEX "StoryboardShotAsset_shotId_idx" ON "StoryboardShotAsset"("shotId");

-- CreateIndex
CREATE INDEX "StoryboardShotAsset_assetId_idx" ON "StoryboardShotAsset"("assetId");

-- AddForeignKey
ALTER TABLE "StoryboardShotAsset" ADD CONSTRAINT "StoryboardShotAsset_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "StoryboardShot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryboardShotAsset" ADD CONSTRAINT "StoryboardShotAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
