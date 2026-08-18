import { describe, expect, it } from "vitest";
import { ApiClient } from "../../../../../packages/api-client/src";

describe("api-client render", () => {
  it("calls render endpoints without leaking secrets", async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), method: init?.method });
      return new Response(
        JSON.stringify({
          id: "job-1",
          status: "QUEUED",
          timelineVersion: 3,
          progress: 0,
          currentStage: "QUEUED",
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const client = new ApiClient("http://localhost:3011");
      await client.createRenderJob("proj-1", "ep-1");
      await client.getRenderJobs("proj-1", "ep-1");
      await client.getRenderJob("proj-1", "job-1");
      await client.cancelRenderJob("proj-1", "job-1");
      await client.retryRenderJob("proj-1", "job-1");
      await client.getRenderArtifact("proj-1", "job-1");
      await client.getRenderArtifactById("proj-1", "art-1");
      expect(calls.map((item) => `${item.method || "GET"} ${item.url}`)).toEqual([
        "POST http://localhost:3011/projects/proj-1/episodes/ep-1/render",
        "GET http://localhost:3011/projects/proj-1/render-jobs?episodeId=ep-1",
        "GET http://localhost:3011/projects/proj-1/render-jobs/job-1",
        "POST http://localhost:3011/projects/proj-1/render-jobs/job-1/cancel",
        "POST http://localhost:3011/projects/proj-1/render-jobs/job-1/retry",
        "GET http://localhost:3011/projects/proj-1/render-jobs/job-1/artifact",
        "GET http://localhost:3011/projects/proj-1/render-artifacts/art-1",
      ]);
      expect(JSON.stringify(calls)).not.toContain("apiKey");
      expect(JSON.stringify(calls)).not.toContain("encryptedApiKey");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
