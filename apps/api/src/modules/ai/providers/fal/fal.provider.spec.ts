import { describe, expect, it, vi, afterEach } from "vitest";
import { AiProviderError } from "../../ai.errors";
import { FalClient, mapFalHttpError, normalizeFalModelPath } from "./fal.client";
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

describe("fal.client helpers", () => {
  it("normalizes model path", () => {
    expect(normalizeFalModelPath("fal-ai/flux/schnell")).toBe("fal-ai/flux/schnell");
    expect(normalizeFalModelPath("https://queue.fal.run/fal-ai/flux/schnell")).toBe(
      "fal-ai/flux/schnell",
    );
  });

  it("maps http errors", () => {
    expect(mapFalHttpError(401, {}, "secret").code).toBe("MISSING_API_KEY");
    expect(mapFalHttpError(404, { error: "Model not found" }, "secret").code).toBe(
      "MODEL_NOT_FOUND",
    );
    expect(mapFalHttpError(429, {}, "secret").message).toContain("频繁");
  });
});

describe("FalClient", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("submits, polls, and returns result", async () => {
    const calls: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method || "GET"} ${url}`);
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      expect(auth).toBe("Key test-key");
      if (url.endsWith("/fal-ai/flux/schnell") && init?.method === "POST") {
        return new Response(JSON.stringify({ request_id: "req-1" }), { status: 200 });
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
      pollIntervalMs: 10,
      maxPollAttempts: 3,
    });
    const result = await client.runModel("fal-ai/flux/schnell", { prompt: "cat" });
    expect(result.requestId).toBe("req-1");
    expect(result.data.images?.[0]?.url).toContain("out.png");
    expect(calls[0]).toContain("POST");
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
    await expect(provider.generateImage({ prompt: "x" })).rejects.toBeInstanceOf(AiProviderError);
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

  it("normalizes successful image response", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") {
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
    const result = await provider.generateImage({ prompt: "hero" });
    expect(result.images[0]?.url).toBe("https://cdn.example/i.png");
    expect(result.provider).toBe("FAL");
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
