-- CreateEnum
CREATE TYPE "StoryboardStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'LOCKED', 'STALE');
CREATE TYPE "StoryboardShotType" AS ENUM ('ESTABLISHING', 'WIDE', 'FULL', 'MEDIUM', 'MEDIUM_CLOSE_UP', 'CLOSE_UP', 'EXTREME_CLOSE_UP', 'OVER_SHOULDER', 'POV', 'TWO_SHOT', 'INSERT', 'AERIAL', 'DYNAMIC');
CREATE TYPE "StoryboardShotSize" AS ENUM ('EXTREME_WIDE', 'WIDE', 'FULL', 'MEDIUM', 'MEDIUM_CLOSE_UP', 'CLOSE_UP', 'EXTREME_CLOSE_UP');
CREATE TYPE "CameraMovement" AS ENUM ('STATIC', 'PAN', 'TILT', 'DOLLY_IN', 'DOLLY_OUT', 'TRUCK_LEFT', 'TRUCK_RIGHT', 'CRANE_UP', 'CRANE_DOWN', 'ZOOM_IN', 'ZOOM_OUT', 'HANDHELD', 'ORBIT', 'FOLLOW', 'TRACKING');
CREATE TYPE "CameraAngle" AS ENUM ('EYE_LEVEL', 'LOW_ANGLE', 'HIGH_ANGLE', 'BIRDS_EYE', 'WORMS_EYE', 'DUTCH_ANGLE', 'OVERHEAD');
CREATE TYPE "StoryboardTransition" AS ENUM ('CUT', 'FADE_IN', 'FADE_OUT', 'DISSOLVE', 'WIPE', 'MATCH_CUT', 'SMASH_CUT');

-- CreateTable
CREATE TABLE "Storyboard" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "StoryboardStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalDurationSeconds" INTEGER,
    "sourceScriptVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Storyboard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Storyboard_episodeId_key" ON "Storyboard"("episodeId");
CREATE INDEX "Storyboard_projectId_idx" ON "Storyboard"("projectId");

ALTER TABLE "Storyboard" ADD CONSTRAINT "Storyboard_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Storyboard" ADD CONSTRAINT "Storyboard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "StoryboardShot" (
    "id" TEXT NOT NULL,
    "storyboardId" TEXT NOT NULL,
    "sceneId" TEXT,
    "scriptBlockId" TEXT,
    "shotNumber" INTEGER NOT NULL,
    "shotType" "StoryboardShotType" NOT NULL,
    "shotSize" "StoryboardShotSize" NOT NULL,
    "cameraMovement" "CameraMovement" NOT NULL,
    "cameraAngle" "CameraAngle" NOT NULL,
    "composition" TEXT,
    "visualDescription" TEXT NOT NULL,
    "characterIds" JSONB,
    "location" TEXT,
    "action" TEXT,
    "dialogue" TEXT,
    "narration" TEXT,
    "direction" TEXT,
    "durationSeconds" INTEGER NOT NULL,
    "transition" "StoryboardTransition" NOT NULL DEFAULT 'CUT',
    "lighting" TEXT,
    "mood" TEXT,
    "visualStyle" TEXT,
    "imagePrompt" TEXT,
    "videoPrompt" TEXT,
    "negativePrompt" TEXT,
    "continuityNotes" TEXT,
    "cameraMovementParams" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryboardShot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoryboardShot_storyboardId_shotNumber_key" ON "StoryboardShot"("storyboardId", "shotNumber");
CREATE INDEX "StoryboardShot_storyboardId_idx" ON "StoryboardShot"("storyboardId");
CREATE INDEX "StoryboardShot_sceneId_idx" ON "StoryboardShot"("sceneId");
CREATE INDEX "StoryboardShot_scriptBlockId_idx" ON "StoryboardShot"("scriptBlockId");

ALTER TABLE "StoryboardShot" ADD CONSTRAINT "StoryboardShot_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "Storyboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryboardShot" ADD CONSTRAINT "StoryboardShot_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoryboardShot" ADD CONSTRAINT "StoryboardShot_scriptBlockId_fkey" FOREIGN KEY ("scriptBlockId") REFERENCES "ScriptBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
