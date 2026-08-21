import { describe, expect, it } from "vitest";
import { parseModelJson } from "./providers/openai-compatible.provider";
import { AiProviderError } from "./ai.errors";
import { OpenAiCompatibleProvider } from "./providers/openai-compatible.provider";

describe("OpenAI-compatible provider", () => {
  it("parses structured JSON from a raw object", () => {
    const value = parseModelJson('{"hello":"world"}');
    expect(value).toEqual({ hello: "world" });
  });

  it("parses JSON fenced in markdown", () => {
    const value = parseModelJson('```json\n{"ok":true}\n```');
    expect(value).toEqual({ ok: true });
  });

  it("strips prose and trailing commas before parsing", () => {
    const value = parseModelJson(
      'Here is the result:\n{"shots":[{"id":"1"},]}\nThanks',
    );
    expect(value).toEqual({ shots: [{ id: "1" }] });
  });

  it("fails on invalid JSON", () => {
    expect(() => parseModelJson("not-json")).toThrow(AiProviderError);
    expect(() => parseModelJson("not-json")).toThrow(/非法 JSON/);
  });

  it("rejects missing API key", async () => {
    const provider = new OpenAiCompatibleProvider({
      baseUrl: "https://example.test/v1",
      apiKey: "",
      model: "demo",
    });
    await expect(
      provider.generateText({ prompt: "hi" }),
    ).rejects.toMatchObject({ code: "MISSING_API_KEY" });
  });

  it("calls the chat completions endpoint", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"name":"星河"}' } }],
        }),
        { status: 200 },
      )) as typeof fetch;

    try {
      const provider = new OpenAiCompatibleProvider({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "demo-model",
      });
      const result = await provider.generateStructured({ prompt: "build world" });
      expect(result).toEqual({ name: "星河" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("tests connection with a minimal request", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "OK" } }],
        }),
        { status: 200 },
      )) as typeof fetch;

    try {
      const provider = new OpenAiCompatibleProvider({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "demo-model",
      });
      await expect(provider.testConnection()).resolves.toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not leak the API key in test failures", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "bad sk-test" } }), {
        status: 401,
      })) as typeof fetch;

    try {
      const provider = new OpenAiCompatibleProvider({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "demo-model",
      });
      await expect(provider.testConnection()).rejects.toMatchObject({
        code: "MISSING_API_KEY",
      });
      try {
        await provider.testConnection();
      } catch (error) {
        expect(String(error)).not.toContain("sk-test");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("calls the OpenAI compatible image API", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://example.test/v1/images/generations");
      const body = JSON.parse(String(init?.body));
      expect(body.prompt).toBe("hero");
      expect(JSON.stringify(body)).not.toContain("sk-test");
      return new Response(
        JSON.stringify({
          data: [{ b64_json: "aaa", revised_prompt: "a hero" }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const provider = new OpenAiCompatibleProvider({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "demo-model",
      });
      const result = await provider.generateImage({ prompt: "hero" });
      expect(result.images[0]?.base64).toBe("aaa");
      expect(result.images[0]?.mimeType).toBe("image/png");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps missing image endpoint to CAPABILITY_NOT_SUPPORTED", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "no images sk-test" } }), {
        status: 404,
      })) as typeof fetch;
    try {
      const provider = new OpenAiCompatibleProvider({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "demo-model",
      });
      await expect(provider.generateImage({ prompt: "hero" })).rejects.toMatchObject({
        code: "CAPABILITY_NOT_SUPPORTED",
      });
      try {
        await provider.generateImage({ prompt: "hero" });
      } catch (error) {
        expect(String(error)).not.toContain("sk-test");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps invalid API key responses", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "bad sk-test" } }), {
        status: 401,
      })) as typeof fetch;

    try {
      const provider = new OpenAiCompatibleProvider({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "demo-model",
      });
      await expect(provider.testConnection()).rejects.toMatchObject({
        code: "MISSING_API_KEY",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("delegates generateVideo to the compatible video adapter", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("https://example.test/v1/videos/generations");
      return new Response(
        JSON.stringify({ data: [{ url: "https://cdn.example/v.mp4" }] }),
        { status: 200 },
      );
    }) as typeof fetch;
    try {
      const provider = new OpenAiCompatibleProvider({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "demo-model",
      });
      const result = await provider.generateVideo({ prompt: "walk" });
      expect(result.url).toBe("https://cdn.example/v.mp4");
      expect(result.mimeType).toBe("video/mp4");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps missing video endpoint to CAPABILITY_NOT_SUPPORTED", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "no videos sk-test" } }), {
        status: 404,
      })) as typeof fetch;
    try {
      const provider = new OpenAiCompatibleProvider({
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test",
        model: "demo-model",
      });
      await expect(provider.generateVideo({ prompt: "walk" })).rejects.toMatchObject({
        code: "CAPABILITY_NOT_SUPPORTED",
      });
      try {
        await provider.generateVideo({ prompt: "walk" });
      } catch (error) {
        expect(String(error)).not.toContain("sk-test");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
