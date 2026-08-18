import { Injectable } from "@nestjs/common";
import { AiCapability, AiProviderKind } from "@prisma/client";
import type { AiProvider, AiStructuredRequest, AiTextRequest, AiImageRequest, AiVideoRequest, AiImageToVideoRequest, AiSpeechRequest } from "./ai.provider";
import { ProviderResolver, type ResolvedAiProvider } from "./provider-resolver";
import { instantiateAiProvider } from "./providers/create-provider";

@Injectable()
export class AiService {
  constructor(private readonly resolver: ProviderResolver) {}

  resolveForProject(projectId: string): Promise<ResolvedAiProvider> {
    return this.resolver.resolve(projectId);
  }

  resolveForCapability(
    projectId: string | undefined,
    capability: AiCapability,
  ): Promise<ResolvedAiProvider> {
    return this.resolver.resolveForCapability({ projectId, capability });
  }

  createRuntime(resolved: ResolvedAiProvider): AiProvider {
    return instantiateAiProvider(resolved.kind, {
      baseUrl: resolved.baseUrl,
      apiKey: resolved.apiKey,
      model: resolved.model,
    });
  }

  async generateText(
    request: AiTextRequest,
    projectId?: string,
  ): Promise<string> {
    const resolved = await this.resolver.resolveForCapability({
      projectId,
      capability: AiCapability.CHAT,
    });
    return this.createRuntime(resolved).generateText({
      ...request,
      model: request.model || resolved.model,
    });
  }

  async generateStructured(
    request: AiStructuredRequest,
    projectId?: string,
  ): Promise<unknown> {
    const resolved = await this.resolver.resolveForCapability({
      projectId,
      capability: AiCapability.STRUCTURED_OUTPUT,
    });
    return this.createRuntime(resolved).generateStructured({
      ...request,
      model: request.model || resolved.model,
    });
  }

  generateWith(
    resolved: ResolvedAiProvider,
    request: AiStructuredRequest,
  ): Promise<unknown> {
    return this.createRuntime(resolved).generateStructured({
      ...request,
      model: request.model || resolved.model,
    });
  }

  generateImageWith(
    resolved: ResolvedAiProvider,
    request: AiImageRequest,
  ) {
    return this.createRuntime(resolved).generateImage({
      ...request,
      model: request.model || resolved.model,
    });
  }

  generateVideoWith(
    resolved: ResolvedAiProvider,
    request: AiVideoRequest,
  ) {
    return this.createRuntime(resolved).generateVideo({
      ...request,
      model: request.model || resolved.model,
    });
  }

  generateImageToVideoWith(
    resolved: ResolvedAiProvider,
    request: AiImageToVideoRequest,
  ) {
    return this.createRuntime(resolved).generateImageToVideo({
      ...request,
      model: request.model || resolved.model,
    });
  }

  generateSpeechWith(
    resolved: ResolvedAiProvider,
    request: AiSpeechRequest,
  ) {
    return this.createRuntime(resolved).generateSpeech({
      ...request,
      model: request.model || resolved.model,
    });
  }

  runtimeFromConfig(input: {
    kind: AiProviderKind | string;
    baseUrl: string;
    apiKey: string;
    model: string;
  }): AiProvider {
    return instantiateAiProvider(input.kind, {
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      model: input.model,
    });
  }
}
