-- Data-preserving Project workspace migration.
-- Maps existing title -> name, ACTIVE -> IN_PROGRESS, and adds genre/cover/currentStep.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Project'
      AND column_name = 'title'
  ) THEN
    ALTER TABLE "Project" RENAME COLUMN "title" TO "name";
  END IF;
END $$;

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "genre" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "cover" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectStep') THEN
    CREATE TYPE "ProjectStep" AS ENUM (
      'WORLD',
      'CHARACTERS',
      'LOCATIONS',
      'EPISODES',
      'SCRIPT',
      'STORYBOARD',
      'IMAGES',
      'VIDEOS',
      'VOICES',
      'RENDER'
    );
  END IF;
END $$;

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "currentStep" "ProjectStep" NOT NULL DEFAULT 'WORLD';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectStatus')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'ProjectStatus' AND e.enumlabel = 'IN_PROGRESS'
     ) THEN
    CREATE TYPE "ProjectStatus_new" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

    ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;

    ALTER TABLE "Project"
      ALTER COLUMN "status" TYPE "ProjectStatus_new"
      USING (
        CASE "status"::text
          WHEN 'ACTIVE' THEN 'IN_PROGRESS'
          WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
          WHEN 'COMPLETED' THEN 'COMPLETED'
          WHEN 'ARCHIVED' THEN 'ARCHIVED'
          ELSE 'DRAFT'
        END
      )::"ProjectStatus_new";

    DROP TYPE "ProjectStatus";
    ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
    ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"ProjectStatus";
  END IF;
END $$;
