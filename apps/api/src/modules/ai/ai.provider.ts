export interface AiTextRequest {
  system?: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
}

export interface AiStructuredRequest {
  system?: string;
  prompt: string;
  model?: string;
}

export interface AiProvider {
  readonly name: string;
  generateText(request: AiTextRequest): Promise<string>;
  generateStructured(request: AiStructuredRequest): Promise<unknown>;
  testConnection(): Promise<void>;
}
