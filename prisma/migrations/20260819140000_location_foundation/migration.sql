-- Location foundation for Phase 15.6
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "environment" TEXT;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "atmosphere" TEXT;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "visualStyle" TEXT;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "tags" JSONB;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

ALTER TABLE "Scene" ADD COLUMN IF NOT EXISTS "locationId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Scene_locationId_fkey'
  ) THEN
    ALTER TABLE "Scene"
      ADD CONSTRAINT "Scene_locationId_fkey"
      FOREIGN KEY ("locationId") REFERENCES "Location"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Scene_locationId_idx" ON "Scene"("locationId");
CREATE INDEX IF NOT EXISTS "Location_projectId_idx" ON "Location"("projectId");
CREATE INDEX IF NOT EXISTS "Location_projectId_name_idx" ON "Location"("projectId", "name");

ALTER TYPE "GenerationTaskType" ADD VALUE IF NOT EXISTS 'LOCATION';
