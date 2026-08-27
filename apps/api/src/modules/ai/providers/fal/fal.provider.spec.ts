import { describe, expect, it, vi, afterEach } from "vitest";
import { AiProviderError } from "../../ai.errors";
import {
  FalClient,
  assertFalModelEndpoint,
  buildFalQueueEndpoint,
  mapFalHttpError,
  normalizeFalModelPath,
  requireFalModelPath,
} from "./fal.client";
import { FalProvider } from "./fal.provider";
import {
  buildFalImageInput,
  extractFalImageUrls,
  extractFalVideo,
} from "./fal.mapper";

describe("fal.mapper", () => {
  it("maps image request fields", () => {
    const input = buildFalImageInput({
      prompt: "hero",
      n: 2,
      negativePrompt: "blur",
      seed: 7,
      width: 1024,
      height: 576,
    });
    expect(input).toMatchObject({
      prompt: "hero",
      num_images: 2,
      negative_prompt: "blur",
      seed: 7,
      image_size: { width: 1024, height: 576 },
    });
  });

  it("extracts image urls and video urls", () => {
    expect(
      extractFalImageUrls({
        images: [{ url: "https://cdn.example/a.png", content_type: "image/png" }],
      }),
    ).toEqual([
      { url: "https://cdn.example/a.png", mimeType: "image/png", width: undefined, height: undefined },
    ]);
    expect(
      extractFalVideo({
        video: { url: "https://cdn.example/a.mp4", content_type: "video/mp4", duration: 4 },
      }),
    ).toMatchObject({
      url: "https://cdn.example/a.mp4",
      mimeType: "video/mp4",
      durationSeconds: 4,
    });
  });
});

describe("fal endpoint construction", () => {
  it("builds queue.fal.run/{model}", () => {
    expect(buildFalQueueEndpoint("https://queue.fal.run", "fal-ai/nano-banana-2")).toBe(
      "https://queue.fal.run/fal-ai/nano-banana-2",
    );
    expect(
      buildFalQueueEndpoint("https://queue.fal.run/", "fal-ai/flux/schnell"),
    ).toBe("https://queue.fal.run/fal-ai/flux/schnell");
  });

  it("normalizes full URL models", () => {
    expect(
      normalizeFalModelPath("https://queue.fal.run/fal-ai/nano-banana-2"),
    ).toBe("fal-ai/nano-banana-2");
  });

  it("rejects empty model before any HTTP call", () => {
    expect(() => requireFalModelPath("")).toThrow(/model endpoint is required/i);
    expect(() => requireFalModelPath("https://queue.fal.run")).toThrow(
      /model endpoint is required/i,
    );
    expect(() => buildFalQueueEndpoint("https://queue.fal.run", "")).toThrow(
      /model endpoint is required/i,
    );
  });

  it("rejects owner-only model ids", () => {
    expect(() => requireFalModelPath("fal-ai")).toThrow(/owner\/name/i);
  });

  it("rejects bare queue root endpoints", () => {
    expect(() => assertFalModelEndpoint("https://queue.fal.run", "x")).toThrow(
      /model endpoint is required/i,
    );
  });
});

describe("fal.client helpers", () => {
  it("maps http errors with diagnostics", () => {
    expect(mapFalHttpError(401, {}, "secret").message).toMatch(/Invalid FAL API Key/i);
    expect(mapFalHttpError(403, {}, "secret").message).toMatch(/permissions/i);
    expect(
      mapFalHttpError(404, {}, "secret", { modelPath: "fal-ai/missing" }).code,
    ).toBe("MODEL_NOT_FOUND");
    expect(
      mapFalHttpError(405, {}, "secret", {
        modelPath: "fal-ai/nano-banana-2",
        endpoint: "https://queue.fal.run",
      }).message,
    ).toMatch(/FAL HTTP 405/);
    expect(
      mapFalHttpError(405, {}, "secret", {
        modelPath: "fal-ai/nano-banana-2",
        endpoint: "https://queue.fal.run",
      }).message,
    ).toMatch(/Expected: https:\/\/queue\.fal\.run\/\{model\}/);
    expect(mapFalHttpError(429, {}, "secret").message).toMatch(/rate limit/i);
  });
});

describe("FalClient", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("never POSTs to the queue root and uses Key auth", async () => {
    const calls: Array<{ url: string; method: string; auth?: string; body?: string }> =
      [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = init?.headers as Record<string, string>;
      calls.push({
        url,
        method: init?.method || "GET",
        auth: headers?.Authorization,
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      if (init?.method === "POST") {
        expect(url).toBe("https://queue.fal.run/fal-ai/nano-banana-2");
        expect(url).not.toBe("https://queue.fal.run");
        return new Response(
          JSON.stringify({
            request_id: "req-1",
            status_url:
              "https://queue.fal.run/fal-ai/nano-banana-2/requests/req-1/status",
            response_url:
              "https://queue.fal.run/fal-ai/nano-banana-2/requests/req-1/response",
          }),
          { status: 200 },
        );
      }
      if (url.includes("/status")) {
        return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          images: [{ url: "https://cdn.example/out.png", content_type: "image/png" }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const client = new FalClient({
      apiKey: "test-key",
      pollIntervalMs: 1,
      maxPollAttempts: 3,
    });
    const result = await client.runModel("fal-ai/nano-banana-2", {
      prompt: "A simple cinematic landscape",
    });
    expect(result.requestId).toBe("req-1");
    expect(result.submitUrl).toBe("https://queue.fal.run/fal-ai/nano-banana-2");
    expect(calls[0]?.auth).toBe("Key test-key");
    expect(calls[0]?.auth).not.toMatch(/^Bearer /);
    expect(calls[0]?.body).toContain("A simple cinematic landscape");
    expect(calls.some((c) => c.url === "https://queue.fal.run")).toBe(false);
  });

  it("polls IN_QUEUE → IN_PROGRESS → COMPLETED", async () => {
    let statusCalls = 0;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ request_id: "req-poll" }), { status: 200 });
      }
      if (url.includes("/status")) {
        statusCalls += 1;
        const status =
          statusCalls === 1
            ? "IN_QUEUE"
            : statusCalls === 2
              ? "IN_PROGRESS"
              : "COMPLETED";
        return new Response(JSON.stringify({ status }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ images: [{ url: "https://cdn.example/done.png" }] }),
        { status: 200 },
      );
    }) as typeof fetch;

    const client = new FalClient({
      apiKey: "k",
      pollIntervalMs: 1,
      maxPollAttempts: 5,
    });
    const result = await client.runModel("fal-ai/flux/schnell", { prompt: "x" });
    expect(result.data.images?.[0]?.url).toContain("done.png");
    expect(statusCalls).toBeGreaterThanOrEqual(3);
  });

  it("propagates FAILED queue status", async () => {
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ request_id: "req-fail" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ status: "FAILED", error: "boom" }),
        { status: 200 },
      );
    }) as typeof fetch;
    const client = new FalClient({ apiKey: "k", pollIntervalMs: 1, maxPollAttempts: 2 });
    await expect(
      client.runModel("fal-ai/flux/schnell", { prompt: "x" }),
    ).rejects.toMatchObject({ message: expect.stringContaining("boom") });
  });

  it("maps missing api key on 401", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
    ) as typeof fetch;
    const client = new FalClient({ apiKey: "bad" });
    await expect(client.runModel("fal-ai/flux/schnell", { prompt: "x" })).rejects.toMatchObject({
      code: "MISSING_API_KEY",
    });
  });

  it("maps HTTP 405 to a meaningful provider error", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({}), { status: 405 }),
    ) as typeof fetch;
    const client = new FalClient({ apiKey: "k" });
    await expect(
      client.runModel("fal-ai/nano-banana-2", { prompt: "x" }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/FAL HTTP 405[\s\S]*Expected: https:\/\/queue\.fal\.run\/\{model\}/),
    });
  });

  it("refuses empty model without calling fetch", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const client = new FalClient({ apiKey: "k" });
    await expect(client.runModel("", { prompt: "x" })).rejects.toBeInstanceOf(
      AiProviderError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("FalProvider", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rejects missing api key", async () => {
    const provider = new FalProvider({
      apiKey: "",
      model: "fal-ai/flux/schnell",
      baseUrl: "https://queue.fal.run",
    });
    await expect(provider.generateImage({ prompt: "x" })).rejects.toBeInstanceOf(
      AiProviderError,
    );
  });

  it("rejects chat capability", async () => {
    const provider = new FalProvider({
      apiKey: "k",
      model: "fal-ai/flux/schnell",
      baseUrl: "https://queue.fal.run",
    });
    await expect(provider.generateText({ prompt: "hi" })).rejects.toMatchObject({
      code: "CAPABILITY_NOT_IMPLEMENTED",
    });
  });

  it("normalizes successful image response via queue lifecycle", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") {
        expect(url).toBe("https://queue.fal.run/fal-ai/flux/schnell");
        return new Response(JSON.stringify({ request_id: "r1" }), { status: 200 });
      }
      if (url.includes("/status")) {
        return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          images: [{ url: "https://cdn.example/i.png", width: 512, height: 512 }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const provider = new FalProvider({
      apiKey: "k",
      model: "fal-ai/flux/schnell",
      baseUrl: "https://queue.fal.run",
    });
    const result = await provider.testImageConnection();
    expect(result).toMatchObject({
      provider: "FAL",
      capability: "IMAGE",
      model: "fal-ai/flux/schnell",
      requestId: "r1",
      message: "FAL connection test successful",
    });
  });

  it("normalizes successful video response", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ request_id: "v1" }), { status: 200 });
      }
      if (url.includes("/status")) {
        return new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          video: { url: "https://cdn.example/v.mp4", content_type: "video/mp4", duration: 5 },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const provider = new FalProvider({
      apiKey: "k",
      model: "fal-ai/minimax/video-01",
      baseUrl: "https://queue.fal.run",
    });
    const result = await provider.generateVideo({ prompt: "orbit" });
    expect(result.url).toBe("https://cdn.example/v.mp4");
    expect(result.providerRequestId).toBe("v1");
  });

  it("requires source image for image-to-video", async () => {
    const provider = new FalProvider({
      apiKey: "k",
      model: "fal-ai/kling-video/v1/standard/image-to-video",
      baseUrl: "https://queue.fal.run",
    });
    await expect(provider.generateImageToVideo({ prompt: "move" })).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });
});
