-- AlterEnum
ALTER TYPE "GenerationTaskType" ADD VALUE 'TTS';

-- CreateEnum
CREATE TYPE "ScriptBlockAssetRole" AS ENUM ('REFERENCE', 'GENERATED', 'FINAL');

-- CreateTable
CREATE TABLE "ScriptBlockAsset" (
    "id" TEXT NOT NULL,
    "scriptBlockId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" "ScriptBlockAssetRole" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptBlockAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScriptBlockAsset_scriptBlockId_idx" ON "ScriptBlockAsset"("scriptBlockId");

-- CreateIndex
CREATE INDEX "ScriptBlockAsset_assetId_idx" ON "ScriptBlockAsset"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptBlockAsset_scriptBlockId_assetId_key" ON "ScriptBlockAsset"("scriptBlockId", "assetId");

-- AddForeignKey
ALTER TABLE "ScriptBlockAsset" ADD CONSTRAINT "ScriptBlockAsset_scriptBlockId_fkey" FOREIGN KEY ("scriptBlockId") REFERENCES "ScriptBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptBlockAsset" ADD CONSTRAINT "ScriptBlockAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
