import { describe, expect, it } from "vitest";
import { OpenAiCompatibleTtsAdapter } from "./openai-compatible-tts.adapter";

describe("OpenAiCompatibleTtsAdapter", () => {
  it("maps a successful binary audio/speech response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://example.test/v1/audio/speech");
      const body = JSON.parse(String(init?.body));
      expect(body.input).toBe("你是谁？");
      expect(body.voice).toBe("xinghe");
      expect(JSON.stringify(body)).not.toContain("sk-secret");
      return new Response(Buffer.from("ID3fake-mp3"), {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      });
    }) as typeof fetch;
    try {
      const adapter = new OpenAiCompatibleTtsAdapter();
      const result = await adapter.generateSpeech({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-secret",
        model: "tts-1",
        request: { text: "你是谁？", voice: "xinghe" },
      });
      expect(result.base64).toBe(Buffer.from("ID3fake-mp3").toString("base64"));
      expect(result.mimeType).toBe("audio/mpeg");
      expect(result.format).toBe("mp3");
      expect(result.voice).toBe("xinghe");
      expect(adapter.protocol).toBe("openai-compatible-tts-v1");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps 404 to CAPABILITY_NOT_SUPPORTED without fabricating audio", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "no tts sk-secret" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;
    try {
      const adapter = new OpenAiCompatibleTtsAdapter();
      await expect(
        adapter.generateSpeech({
          baseUrl: "https://example.test/v1",
          apiKey: "sk-secret",
          model: "tts-1",
          request: { text: "hello", voice: "alloy" },
        }),
      ).rejects.toMatchObject({ code: "CAPABILITY_NOT_SUPPORTED" });
      try {
        await adapter.generateSpeech({
          baseUrl: "https://example.test/v1",
          apiKey: "sk-secret",
          model: "tts-1",
          request: { text: "hello", voice: "alloy" },
        });
      } catch (error) {
        expect(String(error)).not.toContain("sk-secret");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not invent audio when the provider returns empty JSON", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;
    try {
      const adapter = new OpenAiCompatibleTtsAdapter();
      await expect(
        adapter.generateSpeech({
          baseUrl: "https://example.test/v1",
          apiKey: "sk-secret",
          model: "tts-1",
          request: { text: "hello", voice: "alloy" },
        }),
      ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
