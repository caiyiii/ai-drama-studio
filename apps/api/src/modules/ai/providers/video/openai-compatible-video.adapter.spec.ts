import { describe, expect, it } from "vitest";
import { OpenAiCompatibleVideoAdapter } from "./openai-compatible-video.adapter";

describe("OpenAiCompatibleVideoAdapter", () => {
  it("maps a successful videos/generations response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://example.test/v1/videos/generations");
      const body = JSON.parse(String(init?.body));
      expect(body.prompt).toBe("hero walks");
      expect(JSON.stringify(body)).not.toContain("sk-secret");
      return new Response(
        JSON.stringify({
          data: [{ url: "https://cdn.example/video.mp4", mime_type: "video/mp4" }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const adapter = new OpenAiCompatibleVideoAdapter();
      const result = await adapter.generateVideo({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-secret",
        model: "demo-video",
        request: { prompt: "hero walks" },
      });
      expect(result.url).toBe("https://cdn.example/video.mp4");
      expect(result.mimeType).toBe("video/mp4");
      expect(adapter.protocol).toBe("openai-compatible-video-v1");
      expect(adapter.supportsAsync).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps 404 to CAPABILITY_NOT_SUPPORTED without fabricating a URL", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "no videos sk-secret" } }), {
        status: 404,
      })) as typeof fetch;
    try {
      const adapter = new OpenAiCompatibleVideoAdapter();
      await expect(
        adapter.generateVideo({
          baseUrl: "https://example.test/v1",
          apiKey: "sk-secret",
          model: "demo-video",
          request: { prompt: "hero" },
        }),
      ).rejects.toMatchObject({ code: "CAPABILITY_NOT_SUPPORTED" });
      try {
        await adapter.generateVideo({
          baseUrl: "https://example.test/v1",
          apiKey: "sk-secret",
          model: "demo-video",
          request: { prompt: "hero" },
        });
      } catch (error) {
        expect(String(error)).not.toContain("sk-secret");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not invent a video when the provider returns empty data", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: [] }), { status: 200 })) as typeof fetch;
    try {
      const adapter = new OpenAiCompatibleVideoAdapter();
      await expect(
        adapter.generateVideo({
          baseUrl: "https://example.test/v1",
          apiKey: "sk-secret",
          model: "demo-video",
          request: { prompt: "hero" },
        }),
      ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
