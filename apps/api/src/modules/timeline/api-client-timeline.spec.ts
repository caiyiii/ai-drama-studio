import { describe, expect, it } from "vitest";
import { ApiClient } from "../../../../../packages/api-client/src";
import { TimelineClipSourceType, TimelineClipType, TimelineTrackType } from "@ai-drama-studio/types";

describe("api-client timeline", () => {
  it("calls timeline, track, clip, manifest and preview endpoints", async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        url: String(input),
        method: init?.method,
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      return new Response(JSON.stringify({ id: "tl-1", tracks: [] }), { status: 200 });
    }) as typeof fetch;
    try {
      const client = new ApiClient("http://localhost:3011");
      await client.getEpisodeTimeline("proj-1", "ep-1");
      await client.buildEpisodeTimeline("proj-1", "ep-1", { rebuild: true });
      await client.updateEpisodeTimeline("proj-1", "ep-1", { fps: 24 });
      await client.getCompositionManifest("proj-1", "ep-1");
      await client.getCompositionPreview("proj-1", "ep-1");
      await client.unlockEpisodeTimeline("proj-1", "ep-1");
      await client.getTimelineTracks("proj-1", "tl-1");
      await client.createTimelineTrack("proj-1", "tl-1", {
        type: TimelineTrackType.VIDEO,
        name: "VIDEO",
      });
      await client.updateTimelineTrack("proj-1", "tl-1", "tr-1", { muted: true });
      await client.getTimelineClips("proj-1", "tl-1");
      await client.createTimelineClip("proj-1", "tl-1", {
        trackId: "tr-1",
        type: TimelineClipType.VIDEO,
        sourceType: TimelineClipSourceType.STORYBOARD_SHOT,
        sourceId: "shot-1",
        assetId: "asset-1",
        startTime: 0,
        duration: 2,
      });
      await client.updateTimelineClip("proj-1", "tl-1", "cl-1", { volume: 0.5 });
      await client.deleteTimelineClip("proj-1", "tl-1", "cl-1");
      await client.deleteTimelineTrack("proj-1", "tl-1", "tr-1");
      await client.deleteEpisodeTimeline("proj-1", "ep-1");
      expect(calls.map((item) => `${item.method || "GET"} ${item.url}`)).toEqual([
        "GET http://localhost:3011/projects/proj-1/episodes/ep-1/timeline",
        "POST http://localhost:3011/projects/proj-1/episodes/ep-1/timeline/build?rebuild=true",
        "PATCH http://localhost:3011/projects/proj-1/episodes/ep-1/timeline",
        "GET http://localhost:3011/projects/proj-1/episodes/ep-1/timeline/manifest",
        "GET http://localhost:3011/projects/proj-1/episodes/ep-1/timeline/preview",
        "POST http://localhost:3011/projects/proj-1/episodes/ep-1/timeline/unlock",
        "GET http://localhost:3011/projects/proj-1/timelines/tl-1/tracks",
        "POST http://localhost:3011/projects/proj-1/timelines/tl-1/tracks",
        "PATCH http://localhost:3011/projects/proj-1/timelines/tl-1/tracks/tr-1",
        "GET http://localhost:3011/projects/proj-1/timelines/tl-1/clips",
        "POST http://localhost:3011/projects/proj-1/timelines/tl-1/clips",
        "PATCH http://localhost:3011/projects/proj-1/timelines/tl-1/clips/cl-1",
        "DELETE http://localhost:3011/projects/proj-1/timelines/tl-1/clips/cl-1",
        "DELETE http://localhost:3011/projects/proj-1/timelines/tl-1/tracks/tr-1",
        "DELETE http://localhost:3011/projects/proj-1/episodes/ep-1/timeline",
      ]);
      expect(JSON.stringify(calls)).not.toContain("apiKey");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
