import { describe, expect, it } from "vitest";
import { AiProviderKind } from "@prisma/client";
import { instantiateAiProvider, isSupportedProviderKind } from "../create-provider";
import { FalProvider } from "./fal.provider";
import { OpenAiCompatibleProvider } from "../openai-compatible.provider";

describe("create-provider FAL", () => {
  it("instantiates FalProvider", () => {
    const provider = instantiateAiProvider(AiProviderKind.FAL, {
      apiKey: "k",
      model: "fal-ai/flux/schnell",
      baseUrl: "",
    });
    expect(provider).toBeInstanceOf(FalProvider);
    expect(provider.name).toBe("fal");
  });

  it("still instantiates OpenAiCompatibleProvider", () => {
    const provider = instantiateAiProvider(AiProviderKind.OPENAI_COMPATIBLE, {
      apiKey: "k",
      model: "deepseek-chat",
      baseUrl: "https://api.deepseek.com",
    });
    expect(provider).toBeInstanceOf(OpenAiCompatibleProvider);
  });

  it("marks FAL as supported", () => {
    expect(isSupportedProviderKind(AiProviderKind.FAL)).toBe(true);
    expect(isSupportedProviderKind(AiProviderKind.OPENAI_COMPATIBLE)).toBe(true);
  });
});
