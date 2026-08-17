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
});
