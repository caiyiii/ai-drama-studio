-- AlterEnum
ALTER TYPE "GenerationTaskType" ADD VALUE IF NOT EXISTS 'CHARACTER';

-- AlterEnum
ALTER TYPE "CharacterRelationType" ADD VALUE IF NOT EXISTS 'MASTER_STUDENT';
ALTER TYPE "CharacterRelationType" ADD VALUE IF NOT EXISTS 'SUPERIOR_SUBORDINATE';
ALTER TYPE "CharacterRelationType" ADD VALUE IF NOT EXISTS 'ACQUAINTANCE';
ALTER TYPE "CharacterRelationType" ADD VALUE IF NOT EXISTS 'OTHER';

-- AlterTable Character
ALTER TABLE "Character" ADD COLUMN "worldId" TEXT,
ADD COLUMN "race" TEXT,
ADD COLUMN "identity" TEXT,
ADD COLUMN "conflict" TEXT,
ADD COLUMN "personalityProfile" JSONB,
ADD COLUMN "appearanceProfile" JSONB,
ADD COLUMN "abilities" JSONB,
ADD COLUMN "voiceProfile" JSONB,
ADD COLUMN "imageProfile" JSONB,
ADD COLUMN "metadata" JSONB;

-- AlterTable CharacterRelationship
ALTER TABLE "CharacterRelationship" ADD COLUMN "label" TEXT,
ADD COLUMN "metadata" JSONB;

-- AlterTable GenerationTask
ALTER TABLE "GenerationTask" ADD COLUMN "appliedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Character_worldId_idx" ON "Character"("worldId");
CREATE INDEX "Character_projectId_name_idx" ON "Character"("projectId", "name");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE SET NULL ON UPDATE CASCADE;
