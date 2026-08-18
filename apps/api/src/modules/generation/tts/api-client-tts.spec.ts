import { describe, expect, it } from "vitest";
import { ApiClient } from "../../../../../../packages/api-client/src";

describe("api-client tts generation", () => {
  it("posts TTS generation and script-block audio endpoints", async () => {
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
      await client.createTtsGeneration("proj-1", {
        episodeId: "ep-1",
        scriptBlockId: "block-1",
        voiceId: "xinghe",
      });
      await client.getTtsGeneration("proj-1", "task-1");
      await client.applyTtsGeneration("proj-1", "task-1");
      await client.getAudioAssets("proj-1");
      await client.getScriptBlockAssets("proj-1", "block-1");
      await client.setPrimaryScriptBlockAsset("proj-1", "block-1", "audio-1");
      expect(calls.map((item) => `${item.method || "GET"} ${item.url}`)).toEqual([
        "POST http://localhost:3011/projects/proj-1/generations/tts",
        "GET http://localhost:3011/projects/proj-1/generations/task-1",
        "POST http://localhost:3011/projects/proj-1/generations/task-1/apply",
        "GET http://localhost:3011/projects/proj-1/assets?type=AUDIO",
        "GET http://localhost:3011/projects/proj-1/script-blocks/block-1/assets",
        "POST http://localhost:3011/projects/proj-1/script-blocks/block-1/assets/audio-1/primary",
      ]);
      expect(calls[0]?.body).toContain("xinghe");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
