import type {
  ImageGenerationResult,
  VideoGenerationResult,
} from "@ai-drama-studio/types";
import { FAL_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { AiProviderError } from "../../ai.errors";
import { capabilityNotImplemented } from "../../capability-not-implemented";
import type {
  AiEmbeddingRequest,
  AiImageRequest,
  AiImageToVideoRequest,
  AiMusicRequest,
  AiProvider,
  AiSfxRequest,
  AiSpeechRequest,
  AiStructuredRequest,
  AiTextRequest,
  AiVideoRequest,
  AiVoiceCloneRequest,
} from "../../ai.provider";
import { FalClient } from "./fal.client";
import {
  buildFalImageInput,
  buildFalVideoInput,
  extractFalImageUrls,
  extractFalVideo,
} from "./fal.mapper";

interface FalProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class FalProvider implements AiProvider {
  readonly name = "fal";
  private readonly client: FalClient;
  private readonly model: string;

  constructor(private readonly config: FalProviderConfig) {
    this.model = config.model.trim();
    this.client = new FalClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl?.trim() || FAL_DEFAULT_BASE_URL,
    });
  }

  async generateText(_request: AiTextRequest): Promise<string> {
    return capabilityNotImplemented("CHAT", "FAL CHAT");
  }

  async generateStructured(_request: AiStructuredRequest): Promise<unknown> {
    return capabilityNotImplemented("STRUCTURED_OUTPUT", "FAL STRUCTURED_OUTPUT");
  }

  async testConnection(): Promise<void> {
    await this.testImageConnection();
  }

  /**
   * Minimal IMAGE queue used by Provider Management "Test Connection".
   * Always targets https://queue.fal.run/{model} — never the queue root.
   */
  async testImageConnection(): Promise<{
    provider: "FAL";
    capability: "IMAGE";
    model: string;
    requestId: string;
    submitUrl: string;
    message: string;
  }> {
    this.assertReady();
    const model = this.model;
    const { requestId, data, submitUrl } = await this.client.runModel(
      model,
      buildFalImageInput({
        prompt: "A simple cinematic landscape",
        n: 1,
      }),
    );
    const images = extractFalImageUrls(data);
    if (images.length === 0) {
      throw new AiProviderError("FAL 图片生成未返回任何结果。", "UNAVAILABLE");
    }
    return {
      provider: "FAL",
      capability: "IMAGE",
      model,
      requestId,
      submitUrl,
      message: "FAL connection test successful",
    };
  }

  async generateImage(request: AiImageRequest): Promise<ImageGenerationResult> {
    this.assertReady();
    const model = (request.model || this.model).trim();
    if (!model) {
      throw new AiProviderError("AI 服务未配置模型。", "MODEL_NOT_FOUND");
    }
    const started = Date.now();
    const { requestId: _requestId, data } = await this.client.runModel(
      model,
      buildFalImageInput(request),
    );
    const images = extractFalImageUrls(data);
    if (images.length === 0) {
      throw new AiProviderError("FAL 图片生成未返回任何结果。", "UNAVAILABLE");
    }
    return {
      images,
      provider: "FAL",
      model,
      requestedCount: request.n ?? 1,
      durationMs: Date.now() - started,
    };
  }

  async generateVideo(request: AiVideoRequest): Promise<VideoGenerationResult> {
    return this.runVideo(request, Boolean(request.imageUrl || request.imageBase64));
  }

  async generateImageToVideo(
    request: AiImageToVideoRequest,
  ): Promise<VideoGenerationResult> {
    if (!request.imageUrl?.trim() && !request.imageBase64?.trim()) {
      throw new AiProviderError("图生视频需要提供源图片。", "UNAVAILABLE");
    }
    return this.runVideo(request, true);
  }

  async generateSpeech(_request: AiSpeechRequest): Promise<never> {
    return capabilityNotImplemented("TTS", "FAL TTS");
  }

  async generateVoiceClone(_request: AiVoiceCloneRequest): Promise<never> {
    return capabilityNotImplemented("VOICE_CLONE", "FAL VOICE_CLONE");
  }

  async generateMusic(_request: AiMusicRequest): Promise<never> {
    return capabilityNotImplemented("MUSIC", "FAL MUSIC");
  }

  async generateSfx(_request: AiSfxRequest): Promise<never> {
    return capabilityNotImplemented("SFX", "FAL SFX");
  }

  async generateEmbedding(_request: AiEmbeddingRequest): Promise<never> {
    return capabilityNotImplemented("EMBEDDING", "FAL EMBEDDING");
  }

  private async runVideo(
    request: AiVideoRequest | AiImageToVideoRequest,
    imageToVideo: boolean,
  ): Promise<VideoGenerationResult> {
    this.assertReady();
    const model = (request.model || this.model).trim();
    if (!model) {
      throw new AiProviderError("AI 服务未配置模型。", "MODEL_NOT_FOUND");
    }
    const { requestId, data } = await this.client.runModel(
      model,
      buildFalVideoInput(request, imageToVideo),
    );
    const video = extractFalVideo(data);
    if (!video) {
      throw new AiProviderError("FAL 视频生成未返回任何结果。", "UNAVAILABLE");
    }
    return {
      ...video,
      provider: "FAL",
      model,
      providerRequestId: requestId,
      metadata: {
        imageToVideo,
      },
    };
  }

  private assertReady() {
    if (!this.config.apiKey.trim()) {
      throw new AiProviderError("AI 服务未配置 API Key。", "MISSING_API_KEY");
    }
    if (!this.model) {
      throw new AiProviderError("AI 服务未配置模型。", "MODEL_NOT_FOUND");
    }
  }
}
