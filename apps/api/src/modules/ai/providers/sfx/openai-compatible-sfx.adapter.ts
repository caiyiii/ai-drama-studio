import type { GeneratedAudio } from "@ai-drama-studio/types";
import type { AiSfxRequest } from "../../ai.provider";
import { OpenAiCompatibleAudioMediaAdapter } from "../music/openai-compatible-audio-media.adapter";

export interface SfxProviderAdapter {
  readonly protocol: string;
  generateSfx(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    request: AiSfxRequest;
  }): Promise<GeneratedAudio>;
}

export class OpenAiCompatibleSfxAdapter implements SfxProviderAdapter {
  readonly protocol = "openai-compatible-sfx-v1";
  private readonly media = new OpenAiCompatibleAudioMediaAdapter({
    protocol: this.protocol,
    path: "/sfx/generations",
    label: "音效生成",
  });

  generateSfx(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    request: AiSfxRequest;
  }): Promise<GeneratedAudio> {
    const model = input.request.model || input.model;
    const body: Record<string, unknown> = {
      model,
      prompt: input.request.prompt,
    };
    if (typeof input.request.durationSeconds === "number") {
      body.seconds = input.request.durationSeconds;
    }
    if (input.request.category) body.category = input.request.category;
    if (input.request.intensity) body.intensity = input.request.intensity;
    if (input.request.negativePrompt) {
      body.negative_prompt = input.request.negativePrompt;
    }
    return this.media.generate({
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      model,
      body,
    });
  }
}
