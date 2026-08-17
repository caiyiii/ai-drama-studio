-- CreateEnum
CREATE TYPE "AiCapability" AS ENUM (
  'CHAT',
  'STRUCTURED_OUTPUT',
  'IMAGE',
  'VIDEO',
  'IMAGE_TO_VIDEO',
  'TTS',
  'VOICE_CLONE',
  'MUSIC',
  'EMBEDDING'
);

-- AlterTable
ALTER TABLE "GenerationTask" ADD COLUMN "capability" "AiCapability",
ADD COLUMN "usage" JSONB;

-- CreateTable
CREATE TABLE "AiProviderCapability" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "capability" "AiCapability" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModel" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "capabilities" "AiCapability"[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAiConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "capability" "AiCapability" NOT NULL,
    "providerId" TEXT,
    "modelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiProviderCapability_providerId_capability_key" ON "AiProviderCapability"("providerId", "capability");

-- CreateIndex
CREATE INDEX "AiProviderCapability_providerId_idx" ON "AiProviderCapability"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "AiModel_providerId_modelId_key" ON "AiModel"("providerId", "modelId");

-- CreateIndex
CREATE INDEX "AiModel_providerId_idx" ON "AiModel"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAiConfig_projectId_capability_key" ON "ProjectAiConfig"("projectId", "capability");

-- CreateIndex
CREATE INDEX "ProjectAiConfig_projectId_idx" ON "ProjectAiConfig"("projectId");

-- CreateIndex
CREATE INDEX "ProjectAiConfig_providerId_idx" ON "ProjectAiConfig"("providerId");

-- AddForeignKey
ALTER TABLE "AiProviderCapability" ADD CONSTRAINT "AiProviderCapability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiModel" ADD CONSTRAINT "AiModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAiConfig" ADD CONSTRAINT "ProjectAiConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAiConfig" ADD CONSTRAINT "ProjectAiConfig_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AiProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAiConfig" ADD CONSTRAINT "ProjectAiConfig_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill existing providers with text capabilities and a legacy default model.
INSERT INTO "AiProviderCapability" ("id", "providerId", "capability", "enabled", "createdAt", "updatedAt")
SELECT
  CONCAT('cap_', p."id", '_', cap.capability),
  p."id",
  cap.capability,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "AiProvider" p
CROSS JOIN (
  SELECT 'CHAT'::"AiCapability" AS capability
  UNION ALL
  SELECT 'STRUCTURED_OUTPUT'::"AiCapability"
) AS cap;

INSERT INTO "AiModel" ("id", "providerId", "name", "modelId", "capabilities", "enabled", "createdAt", "updatedAt")
SELECT
  CONCAT('mdl_', p."id"),
  p."id",
  p."model",
  p."model",
  ARRAY['CHAT'::"AiCapability", 'STRUCTURED_OUTPUT'::"AiCapability"],
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "AiProvider" p;
