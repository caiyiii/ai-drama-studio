-- CreateEnum
CREATE TYPE "ScriptStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'LOCKED');
CREATE TYPE "ScriptBlockType" AS ENUM ('DIALOGUE', 'ACTION', 'NARRATION', 'DIRECTION');

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ScriptStatus" NOT NULL DEFAULT 'DRAFT',
    "logline" TEXT,
    "summary" TEXT,
    "estimatedDurationSeconds" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Script_episodeId_key" ON "Script"("episodeId");
CREATE INDEX "Script_projectId_idx" ON "Script"("projectId");

ALTER TABLE "Script" ADD CONSTRAINT "Script_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Script" ADD CONSTRAINT "Script_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "timeOfDay" TEXT,
    "summary" TEXT,
    "purpose" TEXT,
    "conflict" TEXT,
    "estimatedDurationSeconds" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Scene_scriptId_number_key" ON "Scene"("scriptId", "number");
CREATE INDEX "Scene_scriptId_idx" ON "Scene"("scriptId");

ALTER TABLE "Scene" ADD CONSTRAINT "Scene_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ScriptBlock" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "ScriptBlockType" NOT NULL,
    "content" TEXT NOT NULL,
    "characterId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScriptBlock_sceneId_order_key" ON "ScriptBlock"("sceneId", "order");
CREATE INDEX "ScriptBlock_sceneId_idx" ON "ScriptBlock"("sceneId");
CREATE INDEX "ScriptBlock_characterId_idx" ON "ScriptBlock"("characterId");

ALTER TABLE "ScriptBlock" ADD CONSTRAINT "ScriptBlock_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScriptBlock" ADD CONSTRAINT "ScriptBlock_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
