import { describe, expect, it } from "vitest";
import { ApiClient } from "../../../../../../packages/api-client/src";

describe("api-client video generation", () => {
  it("posts VIDEO and IMAGE_TO_VIDEO generation endpoints", async () => {
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
      await client.createVideoGeneration("proj-1", { shotId: "shot-1" });
      await client.createImageToVideoGeneration("proj-1", {
        shotId: "shot-1",
        sourceAssetId: "img-1",
      });
      await client.getVideoGeneration("proj-1", "task-1");
      await client.applyVideoGeneration("proj-1", "task-1");
      await client.getVideoAssets("proj-1");
      await client.getShotVideoAssets("proj-1", "ep-1", "shot-1");
      await client.setPrimaryVideoAsset("proj-1", "ep-1", "shot-1", "vid-1");
      expect(calls.map((item) => `${item.method || "GET"} ${item.url}`)).toEqual([
        "POST http://localhost:3011/projects/proj-1/generations/video",
        "POST http://localhost:3011/projects/proj-1/generations/image-to-video",
        "GET http://localhost:3011/projects/proj-1/generations/task-1",
        "POST http://localhost:3011/projects/proj-1/generations/task-1/apply",
        "GET http://localhost:3011/projects/proj-1/assets?type=VIDEO",
        "GET http://localhost:3011/projects/proj-1/episodes/ep-1/storyboard/shots/shot-1/assets?type=VIDEO",
        "POST http://localhost:3011/projects/proj-1/episodes/ep-1/storyboard/shots/shot-1/assets/vid-1/primary",
      ]);
      expect(calls[1]?.body).toContain("img-1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
