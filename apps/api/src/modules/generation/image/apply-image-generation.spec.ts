import { describe, expect, it } from "vitest";
import { applyImageGeneration } from "./apply-image-generation";

function createTx() {
  const store = {
    assets: [] as Array<Record<string, unknown>>,
    links: [] as Array<Record<string, unknown>>,
    appliedAt: null as Date | null,
  };
  const tx = {
    storyboardShotAsset: {
      count: async () => store.links.length,
      updateMany: async () => {
        store.links.forEach((item) => {
          item.isPrimary = false;
        });
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.links.push({ ...data });
        return data;
      },
    },
    asset: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        store.assets.push({ ...data });
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

describe("applyImageGeneration", () => {
  it("creates IMAGE assets and a primary FINAL relation", async () => {
    const { tx, store } = createTx();
    await applyImageGeneration(tx as never, {
      projectId: "proj-1",
      shotId: "shot-1",
      taskId: "task-1",
      provider: "Flux",
      model: "flux-dev",
      prompt: "hero",
      files: [
        {
          id: "asset-1",
          saved: {
            storageKey: "assets/proj-1/asset-1/original.png",
            url: "/projects/proj-1/assets/asset-1/file",
            mimeType: "image/png",
            sizeBytes: 10,
          },
          image: { mimeType: "image/png", width: 1024, height: 576 },
        },
      ],
      result: { images: [{ mimeType: "image/png" }] },
    });
    expect(store.assets[0]?.type).toBe("IMAGE");
    expect(store.links[0]?.role).toBe("FINAL");
    expect(store.links[0]?.isPrimary).toBe(true);
    expect(store.appliedAt).toBeInstanceOf(Date);
  });

  it("demotes previous primary without deleting it", async () => {
    const { tx, store } = createTx();
    store.links.push({
      shotId: "shot-1",
      assetId: "old",
      role: "FINAL",
      isPrimary: true,
    });
    await applyImageGeneration(tx as never, {
      projectId: "proj-1",
      shotId: "shot-1",
      taskId: "task-2",
      provider: "Flux",
      model: "flux-dev",
      prompt: "hero v2",
      files: [
        {
          id: "asset-2",
          saved: {
            storageKey: "k",
            url: "/u",
            mimeType: "image/png",
            sizeBytes: 8,
          },
          image: { mimeType: "image/png" },
        },
      ],
      result: { images: [{ mimeType: "image/png" }] },
    });
    expect(store.links[0]?.assetId).toBe("old");
    expect(store.links[0]?.isPrimary).toBe(false);
    expect(store.links[1]?.assetId).toBe("asset-2");
    expect(store.links[1]?.isPrimary).toBe(true);
  });
});
