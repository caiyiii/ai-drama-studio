import { describe, expect, it } from "vitest";
import { AssetsService } from "./assets.service";

function fullAsset(partial: { id: string; type: string; status: string }) {
  return {
    id: partial.id,
    projectId: "proj-1",
    type: partial.type,
    status: partial.status,
    name: partial.id,
    mimeType: partial.type === "VIDEO" ? "video/mp4" : "image/png",
    storageKey: "k",
    url: "/u",
    thumbnailUrl: null,
    width: 1280,
    height: 720,
    durationSeconds: partial.type === "VIDEO" ? 5 : null,
    sizeBytes: 10,
    provider: "demo",
    model: "demo",
    version: 1,
    generationTaskId: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createService() {
  const links = [
    {
      id: "rel-image",
      shotId: "shot-1",
      assetId: "img-1",
      isPrimary: true,
      role: "FINAL",
      sortOrder: 0,
      metadata: null,
      createdAt: new Date(),
      asset: fullAsset({ id: "img-1", type: "IMAGE", status: "READY" }),
    },
    {
      id: "rel-video",
      shotId: "shot-1",
      assetId: "vid-1",
      isPrimary: true,
      role: "FINAL",
      sortOrder: 1,
      metadata: null,
      createdAt: new Date(),
      asset: fullAsset({ id: "vid-1", type: "VIDEO", status: "READY" }),
    },
    {
      id: "rel-video-2",
      shotId: "shot-1",
      assetId: "vid-2",
      isPrimary: false,
      role: "GENERATED",
      sortOrder: 2,
      metadata: null,
      createdAt: new Date(),
      asset: fullAsset({ id: "vid-2", type: "VIDEO", status: "READY" }),
    },
  ];
  const demoteQueries: unknown[] = [];
  const prisma = {
    project: { findUnique: async () => ({ id: "proj-1" }) },
    storyboardShot: {
      findUnique: async () => ({
        id: "shot-1",
        storyboard: { projectId: "proj-1" },
      }),
    },
    storyboardShotAsset: {
      findUnique: async ({
        where,
      }: {
        where: { shotId_assetId: { shotId: string; assetId: string } };
      }) => links.find((item) => item.assetId === where.shotId_assetId.assetId) ?? null,
      findMany: async () => links,
      updateMany: async ({
        where,
        data,
      }: {
        where: { asset?: { type?: string } };
        data: { isPrimary: boolean };
      }) => {
        demoteQueries.push(where);
        links.forEach((item) => {
          if (item.asset.type === where.asset?.type) {
            item.isPrimary = data.isPrimary;
          }
        });
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { isPrimary: boolean; role: string };
      }) => {
        const row = links.find((item) => item.id === where.id);
        if (row) {
          Object.assign(row, data);
        }
        return row;
      },
    },
    asset: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = links.find((item) => item.assetId === where.id);
        return row ? { ...row.asset } : null;
      },
      update: async () => ({}),
    },
    $transaction: async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
  };
  const service = new AssetsService(prisma as never, {} as never);
  return { service, links, demoteQueries };
}

describe("AssetsService.setPrimaryShotAsset", () => {
  it("promotes a video without demoting the final image", async () => {
    const { service, links, demoteQueries } = createService();
    await service.setPrimaryShotAsset("proj-1", "shot-1", "vid-2");
    expect(links.find((item) => item.assetId === "img-1")?.isPrimary).toBe(true);
    expect(links.find((item) => item.assetId === "vid-1")?.isPrimary).toBe(false);
    expect(links.find((item) => item.assetId === "vid-2")?.isPrimary).toBe(true);
    expect(links.find((item) => item.assetId === "vid-2")?.role).toBe("FINAL");
    expect(demoteQueries[0]).toMatchObject({ asset: { type: "VIDEO" } });
  });
});
