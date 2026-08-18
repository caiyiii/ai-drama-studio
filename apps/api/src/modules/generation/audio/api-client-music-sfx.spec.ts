import { describe, expect, it } from "vitest";
import { ApiClient } from "../../../../../../packages/api-client/src";
import { AudioAssetRole } from "@ai-drama-studio/types";

describe("api-client music / sfx generation", () => {
  it("posts music and sfx generation and episode audio endpoints", async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: init?.method,
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      return new Response(JSON.stringify({ id: "task-1", status: "SUCCEEDED" }), {
        status: 200,
      });
    }) as typeof fetch;
    try {
      const client = new ApiClient("http://localhost:3011");
      await client.createMusicGeneration("proj-1", {
        episodeId: "ep-1",
        prompt: "theme",
        durationSeconds: 30,
      });
      await client.getMusicGeneration("proj-1", "task-1");
      await client.applyMusicGeneration("proj-1", "task-1");
      await client.createSfxGeneration("proj-1", {
        episodeId: "ep-1",
        prompt: "boom",
        durationSeconds: 2,
      });
      await client.applySfxGeneration("proj-1", "task-2");
      await client.getMusicAssets("proj-1");
      await client.getSfxAssets("proj-1");
      await client.getEpisodeAudioAssets("proj-1", "ep-1", AudioAssetRole.MUSIC);
      await client.setPrimaryMusicAsset("proj-1", "ep-1", "audio-1");
      await client.setPrimarySfxAsset("proj-1", "ep-1", "audio-2");
      expect(calls.map((item) => `${item.method || "GET"} ${item.url}`)).toEqual([
        "POST http://localhost:3011/projects/proj-1/generations/music",
        "GET http://localhost:3011/projects/proj-1/generations/task-1",
        "POST http://localhost:3011/projects/proj-1/generations/task-1/apply",
        "POST http://localhost:3011/projects/proj-1/generations/sfx",
        "POST http://localhost:3011/projects/proj-1/generations/task-2/apply",
        "GET http://localhost:3011/projects/proj-1/audio-assets?role=MUSIC",
        "GET http://localhost:3011/projects/proj-1/audio-assets?role=SFX",
        "GET http://localhost:3011/projects/proj-1/episodes/ep-1/audio-assets?role=MUSIC",
        "POST http://localhost:3011/projects/proj-1/episodes/ep-1/audio-assets/audio-1/primary?role=MUSIC",
        "POST http://localhost:3011/projects/proj-1/episodes/ep-1/audio-assets/audio-2/primary?role=SFX",
      ]);
      expect(calls[0]?.body).toContain("theme");
      expect(JSON.stringify(calls)).not.toContain("apiKey");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
