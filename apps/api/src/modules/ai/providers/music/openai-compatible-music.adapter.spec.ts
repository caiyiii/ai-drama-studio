import { describe, expect, it } from "vitest";
import { OpenAiCompatibleMusicAdapter } from "./openai-compatible-music.adapter";
import { OpenAiCompatibleSfxAdapter } from "../sfx/openai-compatible-sfx.adapter";

describe("OpenAiCompatible music / sfx adapters", () => {
  it("maps a successful music binary response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://example.test/v1/music/generations");
      const body = JSON.parse(String(init?.body));
      expect(body.prompt).toContain("epic");
      expect(JSON.stringify(body)).not.toContain("sk-secret");
      return new Response(Buffer.from("ID3music"), {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      });
    }) as typeof fetch;
    try {
      const adapter = new OpenAiCompatibleMusicAdapter();
      const result = await adapter.generateMusic({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-secret",
        model: "music-1",
        request: { prompt: "epic theme", durationSeconds: 30 },
      });
      expect(result.base64).toBe(Buffer.from("ID3music").toString("base64"));
      expect(adapter.protocol).toBe("openai-compatible-music-v1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps music 404 to CAPABILITY_NOT_SUPPORTED without fabricating audio", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "no music sk-secret" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;
    try {
      const adapter = new OpenAiCompatibleMusicAdapter();
      await expect(
        adapter.generateMusic({
          baseUrl: "https://example.test/v1",
          apiKey: "sk-secret",
          model: "music-1",
          request: { prompt: "theme" },
        }),
      ).rejects.toMatchObject({ code: "CAPABILITY_NOT_SUPPORTED" });
      try {
        await adapter.generateMusic({
          baseUrl: "https://example.test/v1",
          apiKey: "sk-secret",
          model: "music-1",
          request: { prompt: "theme" },
        });
      } catch (error) {
        expect(String(error)).not.toContain("sk-secret");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps sfx JSON url and sanitizes errors", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("https://example.test/v1/sfx/generations");
      return new Response(
        JSON.stringify({ data: [{ url: "https://cdn.example/boom.wav", mime_type: "audio/wav" }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;
    try {
      const adapter = new OpenAiCompatibleSfxAdapter();
      const result = await adapter.generateSfx({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-secret",
        model: "sfx-1",
        request: { prompt: "explosion", durationSeconds: 2, category: "explosion" },
      });
      expect(result.url).toBe("https://cdn.example/boom.wav");
      expect(result.mimeType).toBe("audio/wav");
      expect(adapter.protocol).toBe("openai-compatible-sfx-v1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
