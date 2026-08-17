import { describe, expect, it } from "vitest";
import { applyVideoGeneration } from "./apply-video-generation";

function createTx() {
  const store = {
    assets: [] as Array<Record<string, unknown>>,
    links: [] as Array<Record<string, unknown>>,
    appliedAt: null as Date | null,
    demoteWhere: null as unknown,
  };
  const tx = {
    storyboardShotAsset: {
      count: async () => store.links.filter((item) => item.mediaType !== "IMAGE").length,
      updateMany: async ({ where }: { where: Record<string, unknown> }) => {
        store.demoteWhere = where;
        store.links.forEach((item) => {
          if (item.mediaType === "VIDEO" || !item.mediaType) {
            item.isPrimary = false;
          }
        });
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.links.push({ ...data, mediaType: "VIDEO" });
        return data;
      },
    },
    asset: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.assets.push(data);
        return data;
      },
    },
    generationTask: {
      update: async ({ data }: { data: { appliedAt: Date } }) => {
        store.appliedAt = data.appliedAt;
      },
    },
  };
  return { tx, store };
}

describe("applyVideoGeneration", () => {
  it("creates a VIDEO asset and primary FINAL relation", async () => {
    const { tx, store } = createTx();
    await applyVideoGeneration(tx as never, {
      projectId: "proj-1",
      shotId: "shot-1",
      taskId: "task-1",
      provider: "Video",
      model: "video-1",
      capability: "IMAGE_TO_VIDEO",
      prompt: "hero walks",
      storyboardVersion: 2,
      file: {
        id: "asset-v1",
        saved: {
          storageKey: "assets/proj-1/asset-v1/video.mp4",
          url: "/projects/proj-1/assets/asset-v1/file",
          mimeType: "video/mp4",
          sizeBytes: 24,
        },
        video: { mimeType: "video/mp4", width: 1280, height: 720, durationSeconds: 5 },
      },
    });
    expect(store.assets[0]?.type).toBe("VIDEO");
    expect(store.links[0]?.role).toBe("FINAL");
    expect(store.links[0]?.isPrimary).toBe(true);
    expect(store.appliedAt).toBeInstanceOf(Date);
    expect((store.assets[0]?.metadata as { storyboardVersion?: number }).storyboardVersion).toBe(2);
  });

  it("demotes previous VIDEO primary without deleting history", async () => {
    const { tx, store } = createTx();
    store.links.push({
      shotId: "shot-1",
      assetId: "old-video",
      role: "FINAL",
      isPrimary: true,
      mediaType: "VIDEO",
    });
    store.links.push({
      shotId: "shot-1",
      assetId: "old-image",
      role: "FINAL",
      isPrimary: true,
      mediaType: "IMAGE",
    });
    await applyVideoGeneration(tx as never, {
      projectId: "proj-1",
      shotId: "shot-1",
      taskId: "task-2",
      provider: "Video",
      model: "video-1",
      capability: "VIDEO",
      prompt: "hero v2",
      storyboardVersion: 2,
      file: {
        id: "asset-v2",
        saved: {
          storageKey: "k",
          url: "/u",
          mimeType: "video/mp4",
          sizeBytes: 8,
        },
        video: { mimeType: "video/mp4" },
      },
    });
    expect(store.links[0]?.assetId).toBe("old-video");
    expect(store.links[0]?.isPrimary).toBe(false);
    expect(store.links[1]?.assetId).toBe("old-image");
    expect(store.links[1]?.isPrimary).toBe(true);
    expect(store.links[2]?.assetId).toBe("asset-v2");
    expect(store.links[2]?.isPrimary).toBe(true);
    expect(store.demoteWhere).toMatchObject({
      asset: { type: "VIDEO" },
    });
  });
});
