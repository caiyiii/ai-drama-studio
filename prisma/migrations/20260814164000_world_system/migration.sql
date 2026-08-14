-- World system tables. Does not drop or alter existing Project rows.

CREATE TABLE "World" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "cosmicBackground" TEXT,
    "coreConflict" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "World_projectId_key" ON "World"("projectId");

ALTER TABLE "World"
ADD CONSTRAINT "World_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Civilization" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "origin" TEXT,
    "philosophy" TEXT,
    "society" TEXT,
    "culture" TEXT,
    "technology" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Civilization_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Civilization_worldId_idx" ON "Civilization"("worldId");

ALTER TABLE "Civilization"
ADD CONSTRAINT "Civilization_worldId_fkey"
FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorldHistory" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorldHistory_worldId_idx" ON "WorldHistory"("worldId");

ALTER TABLE "WorldHistory"
ADD CONSTRAINT "WorldHistory_worldId_fkey"
FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Faction" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "civilizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Faction_worldId_idx" ON "Faction"("worldId");

ALTER TABLE "Faction"
ADD CONSTRAINT "Faction_worldId_fkey"
FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Faction"
ADD CONSTRAINT "Faction_civilizationId_fkey"
FOREIGN KEY ("civilizationId") REFERENCES "Civilization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WorldLocation" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "civilizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WorldLocation_worldId_idx" ON "WorldLocation"("worldId");

ALTER TABLE "WorldLocation"
ADD CONSTRAINT "WorldLocation_worldId_fkey"
FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorldLocation"
ADD CONSTRAINT "WorldLocation_civilizationId_fkey"
FOREIGN KEY ("civilizationId") REFERENCES "Civilization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PowerSystem" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB,
    "levels" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PowerSystem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PowerSystem_worldId_idx" ON "PowerSystem"("worldId");

ALTER TABLE "PowerSystem"
ADD CONSTRAINT "PowerSystem_worldId_fkey"
FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
