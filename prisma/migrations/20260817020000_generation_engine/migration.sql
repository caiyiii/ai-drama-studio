-- Generation engine v1: add WORLD task type and rename
-- PROCESSING -> RUNNING, SUCCESS -> SUCCEEDED. Does not drop rows.

CREATE TYPE "GenerationTaskType_new" AS ENUM (
  'WORLD',
  'SCRIPT',
  'IMAGE',
  'VIDEO',
  'VOICE',
  'STORYBOARD'
);

ALTER TABLE "GenerationTask" ALTER COLUMN "type" TYPE "GenerationTaskType_new"
USING ("type"::text::"GenerationTaskType_new");

DROP TYPE "GenerationTaskType";
ALTER TYPE "GenerationTaskType_new" RENAME TO "GenerationTaskType";

CREATE TYPE "GenerationTaskStatus_new" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

ALTER TABLE "GenerationTask" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "GenerationTask"
ALTER COLUMN "status" TYPE "GenerationTaskStatus_new"
USING (
  CASE "status"::text
    WHEN 'PROCESSING' THEN 'RUNNING'
    WHEN 'SUCCESS' THEN 'SUCCEEDED'
    WHEN 'RUNNING' THEN 'RUNNING'
    WHEN 'SUCCEEDED' THEN 'SUCCEEDED'
    WHEN 'FAILED' THEN 'FAILED'
    WHEN 'CANCELLED' THEN 'CANCELLED'
    ELSE 'PENDING'
  END
)::"GenerationTaskStatus_new";

DROP TYPE "GenerationTaskStatus";
ALTER TYPE "GenerationTaskStatus_new" RENAME TO "GenerationTaskStatus";

ALTER TABLE "GenerationTask"
ALTER COLUMN "status" SET DEFAULT 'PENDING'::"GenerationTaskStatus";

CREATE INDEX IF NOT EXISTS "GenerationTask_projectId_idx" ON "GenerationTask"("projectId");
