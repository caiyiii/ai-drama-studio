import { Injectable } from "@nestjs/common";
import { AiCapability, AiProviderKind } from "@prisma/client";
import type { AiProvider, AiStructuredRequest, AiTextRequest } from "./ai.provider";
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
