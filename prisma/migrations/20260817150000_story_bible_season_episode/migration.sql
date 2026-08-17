-- AlterEnum
ALTER TYPE "GenerationTaskType" ADD VALUE IF NOT EXISTS 'STORY_BIBLE';
ALTER TYPE "GenerationTaskType" ADD VALUE IF NOT EXISTS 'SEASON_OUTLINE';
ALTER TYPE "GenerationTaskType" ADD VALUE IF NOT EXISTS 'EPISODE_OUTLINE';

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('DRAFT', 'PLANNING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "EpisodeStatus" AS ENUM ('DRAFT', 'OUTLINED', 'SCRIPTING', 'READY', 'IN_PRODUCTION', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "StoryBible" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "logline" TEXT,
    "premise" TEXT,
    "theme" TEXT,
    "tone" TEXT,
    "style" TEXT,
    "audience" TEXT,
    "storyPromise" TEXT,
    "rules" JSONB,
    "timelineSummary" TEXT,
    "continuityNotes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryBible_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoryBible_projectId_key" ON "StoryBible"("projectId");

ALTER TABLE "StoryBible" ADD CONSTRAINT "StoryBible_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT,
    "outline" TEXT,
    "status" "SeasonStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Season_projectId_number_key" ON "Season"("projectId", "number");
CREATE INDEX "Season_projectId_idx" ON "Season"("projectId");

ALTER TABLE "Season" ADD CONSTRAINT "Season_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Episode
ALTER TABLE "Episode" ADD COLUMN "seasonId" TEXT;
ALTER TABLE "Episode" ADD COLUMN "number" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Episode" ADD COLUMN "outline" TEXT;
ALTER TABLE "Episode" ADD COLUMN "status" "EpisodeStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Episode" ADD COLUMN "durationSeconds" INTEGER;
ALTER TABLE "Episode" ADD COLUMN "storyState" JSONB;
ALTER TABLE "Episode" ADD COLUMN "continuityNotes" TEXT;
ALTER TABLE "Episode" ADD COLUMN "metadata" JSONB;

UPDATE "Episode" SET "number" = "order";

INSERT INTO "Season" ("id", "projectId", "number", "title", "status", "createdAt", "updatedAt")
SELECT 'legacy-s1-' || e."projectId", e."projectId", 1, '第一季', 'DRAFT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "projectId" FROM "Episode") AS e
WHERE NOT EXISTS (
  SELECT 1 FROM "Season" s WHERE s."projectId" = e."projectId" AND s."number" = 1
);

UPDATE "Episode" AS ep
SET "seasonId" = s."id"
FROM "Season" AS s
WHERE ep."seasonId" IS NULL
  AND s."projectId" = ep."projectId"
  AND s."number" = 1;

ALTER TABLE "Episode" ALTER COLUMN "seasonId" SET NOT NULL;

CREATE UNIQUE INDEX "Episode_seasonId_number_key" ON "Episode"("seasonId", "number");
CREATE INDEX "Episode_seasonId_idx" ON "Episode"("seasonId");

ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
