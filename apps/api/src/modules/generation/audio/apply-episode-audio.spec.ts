import { describe, expect, it } from "vitest";
import { applyEpisodeAudioGeneration } from "./apply-episode-audio";

function createTx() {
  const store = {
    assets: [] as Array<Record<string, unknown>>,
    links: [] as Array<Record<string, unknown>>,
    appliedAt: null as Date | null,
  };
  const tx = {
    episodeAudioAsset: {
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

describe("applyEpisodeAudioGeneration", () => {
  it("creates AUDIO asset and primary MUSIC relation", async () => {
    const { tx, store } = createTx();
    await applyEpisodeAudioGeneration(tx as never, {
      projectId: "proj-1",
      episodeId: "ep-1",
      taskId: "task-1",
      kind: "MUSIC",
      provider: "Music",
      model: "music-1",
      name: "First Contact Theme",
      metadata: { type: "music", style: "cinematic" },
      file: {
        id: "asset-m1",
        saved: {
          storageKey: "assets/proj-1/asset-m1/music.mp3",
          url: "/projects/proj-1/assets/asset-m1/file",
          mimeType: "audio/mpeg",
          sizeBytes: 24,
        },
        audio: { mimeType: "audio/mpeg", durationSeconds: 30 },
      },
    });
    expect(store.assets[0]?.type).toBe("AUDIO");
    expect(store.links[0]?.role).toBe("MUSIC");
    expect(store.links[0]?.isPrimary).toBe(true);
    expect(store.appliedAt).toBeInstanceOf(Date);
    expect(JSON.stringify(store.assets[0])).not.toContain("apiKey");
  });

  it("demotes previous MUSIC primary without deleting history", async () => {
    const { tx, store } = createTx();
    store.links.push({
      episodeId: "ep-1",
      assetId: "old-music",
      role: "MUSIC",
      isPrimary: true,
    });
    await applyEpisodeAudioGeneration(tx as never, {
      projectId: "proj-1",
      episodeId: "ep-1",
      taskId: "task-2",
      kind: "MUSIC",
      provider: "Music",
      model: "music-1",
      name: "Theme v2",
      metadata: { type: "music" },
      file: {
        id: "asset-m2",
        saved: {
          storageKey: "k",
          url: "/u",
          mimeType: "audio/mpeg",
          sizeBytes: 8,
        },
        audio: { mimeType: "audio/mpeg" },
      },
    });
    expect(store.links[0]?.assetId).toBe("old-music");
    expect(store.links[0]?.isPrimary).toBe(false);
    expect(store.links[1]?.isPrimary).toBe(true);
  });
});
