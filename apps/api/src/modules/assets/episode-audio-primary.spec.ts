import { describe, expect, it } from "vitest";
import { AssetsService } from "./assets.service";

describe("episode audio setPrimary", () => {
  it("promotes the same-role asset without calling AI", async () => {
    const aiCalls: string[] = [];
    const links = [
      { id: "rel-1", episodeId: "ep-1", assetId: "a1", role: "MUSIC", isPrimary: true },
      { id: "rel-2", episodeId: "ep-1", assetId: "a2", role: "MUSIC", isPrimary: false },
    ];
    const prisma = {
      project: { findUnique: async () => ({ id: "proj-1" }) },
      episode: { findUnique: async () => ({ id: "ep-1", projectId: "proj-1" }) },
      asset: {
        findUnique: async ({ where: { id } }: { where: { id: string } }) => ({
          id,
          projectId: "proj-1",
          type: "AUDIO",
          status: "READY",
        }),
      },
      episodeAudioAsset: {
        findUnique: async () => links[1],
        findMany: async () =>
          links.map((item) => ({
            ...item,
            sortOrder: 0,
            metadata: { type: "music" },
            createdAt: new Date(),
            asset: {
              id: item.assetId,
              projectId: "proj-1",
              type: "AUDIO",
              status: "READY",
              name: "Theme",
              mimeType: "audio/mpeg",
              storageKey: "k",
              url: "/u",
              thumbnailUrl: null,
              width: null,
              height: null,
              durationSeconds: 12,
              sizeBytes: 8,
              provider: "demo",
              model: "m",
              version: 1,
              generationTaskId: null,
              metadata: { type: "music" },
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          })),
        updateMany: async () => {
          links.forEach((item) => {
            item.isPrimary = false;
          });
        },
        update: async () => {
          links[1]!.isPrimary = true;
        },
      },
      $transaction: async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    };
    const service = new AssetsService(prisma as never, { delete: async () => undefined } as never);
    const result = await service.setPrimaryEpisodeAudioAsset("proj-1", "ep-1", "a2", "MUSIC" as never);
    expect(links[0]?.isPrimary).toBe(false);
    expect(links[1]?.isPrimary).toBe(true);
    expect(result).toHaveLength(2);
    expect(aiCalls).toHaveLength(0);
  });
});
