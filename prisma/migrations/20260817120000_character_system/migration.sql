-- Phase 5 Character & Relationship System v1.
-- Extends the stub Character table from init; does not modify older migrations.

-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CharacterRelationType" AS ENUM (
  'FRIEND',
  'ENEMY',
  'ALLY',
  'RIVAL',
  'MASTER',
  'DISCIPLE',
  'FAMILY',
  'LOVER',
  'COLLEAGUE',
  'TEACHER',
  'STUDENT',
  'PARTNER',
  'UNKNOWN'
);

-- AlterTable
ALTER TABLE "Character" ADD COLUMN "civilizationId" TEXT;
ALTER TABLE "Character" ADD COLUMN "factionId" TEXT;
ALTER TABLE "Character" ADD COLUMN "alias" TEXT;
ALTER TABLE "Character" ADD COLUMN "gender" TEXT;
ALTER TABLE "Character" ADD COLUMN "age" INTEGER;
ALTER TABLE "Character" ADD COLUMN "role" TEXT;
ALTER TABLE "Character" ADD COLUMN "personality" TEXT;
ALTER TABLE "Character" ADD COLUMN "appearance" TEXT;
ALTER TABLE "Character" ADD COLUMN "background" TEXT;
ALTER TABLE "Character" ADD COLUMN "motivation" TEXT;
ALTER TABLE "Character" ADD COLUMN "goal" TEXT;
ALTER TABLE "Character" ADD COLUMN "ability" TEXT;
ALTER TABLE "Character" ADD COLUMN "status" "CharacterStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Character_projectId_idx" ON "Character"("projectId");

-- CreateIndex
CREATE INDEX "Character_civilizationId_idx" ON "Character"("civilizationId");

-- CreateIndex
CREATE INDEX "Character_factionId_idx" ON "Character"("factionId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_civilizationId_fkey" FOREIGN KEY ("civilizationId") REFERENCES "Civilization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CharacterRelationship" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromCharacterId" TEXT NOT NULL,
    "toCharacterId" TEXT NOT NULL,
    "type" "CharacterRelationType" NOT NULL,
    "description" TEXT,
    "strength" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterRelationship_fromCharacterId_toCharacterId_type_key" ON "CharacterRelationship"("fromCharacterId", "toCharacterId", "type");

-- CreateIndex
CREATE INDEX "CharacterRelationship_projectId_idx" ON "CharacterRelationship"("projectId");

-- CreateIndex
CREATE INDEX "CharacterRelationship_fromCharacterId_idx" ON "CharacterRelationship"("fromCharacterId");

-- CreateIndex
CREATE INDEX "CharacterRelationship_toCharacterId_idx" ON "CharacterRelationship"("toCharacterId");

-- AddForeignKey
ALTER TABLE "CharacterRelationship" ADD CONSTRAINT "CharacterRelationship_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterRelationship" ADD CONSTRAINT "CharacterRelationship_fromCharacterId_fkey" FOREIGN KEY ("fromCharacterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterRelationship" ADD CONSTRAINT "CharacterRelationship_toCharacterId_fkey" FOREIGN KEY ("toCharacterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
