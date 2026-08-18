import type { GeneratedAudio } from "@ai-drama-studio/types";
import type { AiMusicRequest } from "../../ai.provider";
import { OpenAiCompatibleAudioMediaAdapter } from "./openai-compatible-audio-media.adapter";

export interface MusicProviderAdapter {
  readonly protocol: string;
  generateMusic(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    request: AiMusicRequest;
  }): Promise<GeneratedAudio>;
}

export class OpenAiCompatibleMusicAdapter implements MusicProviderAdapter {
  readonly protocol = "openai-compatible-music-v1";
  private readonly media = new OpenAiCompatibleAudioMediaAdapter({
    protocol: this.protocol,
    path: "/music/generations",
    label: "音乐生成",
  });

  generateMusic(input: {
    baseUrl: string;
    apiKey: string;
    model: string;
    request: AiMusicRequest;
  }): Promise<GeneratedAudio> {
    const model = input.request.model || input.model;
    const body: Record<string, unknown> = {
      model,
      prompt: input.request.prompt,
    };
    if (typeof input.request.durationSeconds === "number") {
      body.seconds = input.request.durationSeconds;
    }
    if (input.request.style) body.style = input.request.style;
    if (input.request.mood) body.mood = input.request.mood;
    if (input.request.genre) body.genre = input.request.genre;
    if (input.request.instrumentation) {
      body.instrumentation = input.request.instrumentation;
    }
    if (input.request.tempo) body.tempo = input.request.tempo;
    if (input.request.language) body.language = input.request.language;
    if (typeof input.request.isInstrumental === "boolean") {
      body.instrumental = input.request.isInstrumental;
    }
    if (input.request.negativePrompt) {
      body.negative_prompt = input.request.negativePrompt;
    }
    if (input.request.title) body.title = input.request.title;
    if (typeof input.request.loopable === "boolean") {
      body.loopable = input.request.loopable;
    }
    if (input.request.intensity) body.intensity = input.request.intensity;
    return this.media.generate({
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      model,
      body,
    });
  }
}
