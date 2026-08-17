import { Prisma } from "@prisma/client";
import type { WorldGenerationResult } from "@ai-drama-studio/types";

export type WorldApplyClient = {
  world: {
    findUnique: (args: {
      where: { projectId: string };
    }) => Promise<{ id: string } | null>;
    create: (args: {
      data: {
        projectId: string;
        title: string;
        summary: string;
        cosmicBackground: string;
        coreConflict: string;
      };
    }) => Promise<{ id: string }>;
    update: (args: {
      where: { id: string };
      data: {
        title: string;
        summary: string;
        cosmicBackground: string;
        coreConflict: string;
      };
    }) => Promise<{ id: string }>;
  };
  civilization: {
    deleteMany: (args: { where: { worldId: string } }) => Promise<unknown>;
    create: (args: {
      data: {
        worldId: string;
        name: string;
        description: string;
        origin: string;
        philosophy: string;
        society: string;
        culture: string;
        technology: string;
      };
    }) => Promise<{ id: string; name: string }>;
  };
  worldHistory: {
    deleteMany: (args: { where: { worldId: string } }) => Promise<unknown>;
    create: (args: {
      data: {
        worldId: string;
        title: string;
        description: string;
        order: number;
      };
    }) => Promise<unknown>;
  };
  faction: {
    deleteMany: (args: { where: { worldId: string } }) => Promise<unknown>;
    create: (args: {
      data: {
        worldId: string;
        civilizationId: string | null;
        name: string;
        description: string;
        type: string;
      };
    }) => Promise<unknown>;
  };
  worldLocation: {
    deleteMany: (args: { where: { worldId: string } }) => Promise<unknown>;
    create: (args: {
      data: {
        worldId: string;
        civilizationId: string | null;
        name: string;
        description: string;
        type: string;
      };
    }) => Promise<unknown>;
  };
  powerSystem: {
    deleteMany: (args: { where: { worldId: string } }) => Promise<unknown>;
    create: (args: {
      data: {
        worldId: string;
        name: string;
        description: string;
        rules: Prisma.InputJsonValue;
        levels: Prisma.InputJsonValue;
      };
    }) => Promise<unknown>;
  };
};

export async function applyWorldGenerationResult(
  tx: WorldApplyClient,
  projectId: string,
  result: WorldGenerationResult,
): Promise<{ worldId: string }> {
  const existing = await tx.world.findUnique({ where: { projectId } });
  const world = existing
    ? await tx.world.update({
        where: { id: existing.id },
        data: {
          title: result.world.name,
          summary: result.world.description,
          cosmicBackground: result.world.cosmicBackground,
          coreConflict: result.world.coreConflict,
        },
      })
    : await tx.world.create({
        data: {
          projectId,
          title: result.world.name,
          summary: result.world.description,
          cosmicBackground: result.world.cosmicBackground,
          coreConflict: result.world.coreConflict,
        },
      });

  await tx.faction.deleteMany({ where: { worldId: world.id } });
  await tx.worldLocation.deleteMany({ where: { worldId: world.id } });
  await tx.worldHistory.deleteMany({ where: { worldId: world.id } });
  await tx.powerSystem.deleteMany({ where: { worldId: world.id } });
  await tx.civilization.deleteMany({ where: { worldId: world.id } });

  const civilizationIds = new Map<string, string>();
  for (const item of result.civilizations) {
    const created = await tx.civilization.create({
      data: {
        worldId: world.id,
        name: item.name,
        description: item.description,
        origin: item.type,
        philosophy: item.philosophy,
        society: item.society,
        culture: item.culture,
        technology: item.technology,
      },
    });
    civilizationIds.set(created.name, created.id);
  }

  for (const item of result.histories) {
    await tx.worldHistory.create({
      data: {
        worldId: world.id,
        title: item.title,
        description: item.description,
        order: item.order,
      },
    });
  }

  for (const item of result.factions) {
    await tx.faction.create({
      data: {
        worldId: world.id,
        civilizationId: civilizationIds.get(item.civilizationName) ?? null,
        name: item.name,
        description: item.description,
        type: "其他",
      },
    });
  }

  for (const item of result.locations) {
    await tx.worldLocation.create({
      data: {
        worldId: world.id,
        civilizationId: civilizationIds.get(item.civilizationName) ?? null,
        name: item.name,
        description: item.description,
        type: "其他",
      },
    });
  }

  for (const item of result.powerSystems) {
    await tx.powerSystem.create({
      data: {
        worldId: world.id,
        name: item.name,
        description: item.description,
        rules: item.rules as unknown as Prisma.InputJsonValue,
        levels: item.levels as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return { worldId: world.id };
}
