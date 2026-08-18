import { describe, expect, it } from "vitest";
import { applyTtsGeneration } from "./apply-tts-generation";

function createTx() {
  const store = {
    assets: [] as Array<Record<string, unknown>>,
    links: [] as Array<Record<string, unknown>>,
    appliedAt: null as Date | null,
    demoteWhere: null as unknown,
  };
  const tx = {
    scriptBlockAsset: {
      count: async () => store.links.length,
      updateMany: async ({ where }: { where: Record<string, unknown> }) => {
        store.demoteWhere = where;
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

describe("applyTtsGeneration", () => {
  it("creates an AUDIO asset and primary FINAL relation", async () => {
    const { tx, store } = createTx();
    await applyTtsGeneration(tx as never, {
      projectId: "proj-1",
      scriptBlockId: "block-1",
      taskId: "task-1",
      provider: "TTS",
      model: "tts-1",
      capability: "TTS",
      text: "你是谁？",
      characterId: "char-1",
      voiceId: "xinghe",
      language: "zh-CN",
      file: {
        id: "asset-a1",
        saved: {
          storageKey: "assets/proj-1/asset-a1/audio.mp3",
          url: "/projects/proj-1/assets/asset-a1/file",
          mimeType: "audio/mpeg",
          sizeBytes: 24,
        },
        audio: { mimeType: "audio/mpeg", format: "mp3", durationSeconds: 2 },
      },
    });
    expect(store.assets[0]?.type).toBe("AUDIO");
    expect(store.links[0]?.role).toBe("FINAL");
    expect(store.links[0]?.isPrimary).toBe(true);
    expect(store.appliedAt).toBeInstanceOf(Date);
    expect((store.assets[0]?.metadata as { source?: string }).source).toBe("tts");
    expect(JSON.stringify(store.assets[0])).not.toContain("apiKey");
  });

  it("demotes previous AUDIO primary without deleting history", async () => {
    const { tx, store } = createTx();
    store.links.push({
      scriptBlockId: "block-1",
      assetId: "old-audio",
      role: "FINAL",
      isPrimary: true,
    });
    await applyTtsGeneration(tx as never, {
      projectId: "proj-1",
      scriptBlockId: "block-1",
      taskId: "task-2",
      provider: "TTS",
      model: "tts-1",
      capability: "TTS",
      text: "你是谁？",
      file: {
        id: "asset-a2",
        saved: {
          storageKey: "k",
          url: "/u",
          mimeType: "audio/mpeg",
          sizeBytes: 8,
        },
        audio: { mimeType: "audio/mpeg" },
      },
    });
    expect(store.links[0]?.assetId).toBe("old-audio");
    expect(store.links[0]?.isPrimary).toBe(false);
    expect(store.links[1]?.assetId).toBe("asset-a2");
    expect(store.links[1]?.isPrimary).toBe(true);
    expect(store.demoteWhere).toMatchObject({
      asset: { type: "AUDIO" },
    });
  });
});
