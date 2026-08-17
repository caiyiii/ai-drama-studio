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

export interface AiImageRequest {
  prompt: string;
  model?: string;
}

export interface AiVideoRequest {
  prompt: string;
  model?: string;
}

export interface AiImageToVideoRequest {
  prompt: string;
  imageUrl?: string;
  model?: string;
}

export interface AiSpeechRequest {
  text: string;
  model?: string;
  voice?: string;
}

export interface AiVoiceCloneRequest {
  text: string;
  referenceUrl?: string;
  model?: string;
}

export interface AiMusicRequest {
  prompt: string;
  model?: string;
}

export interface AiEmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface AiProvider {
  readonly name: string;
  generateText(request: AiTextRequest): Promise<string>;
  generateStructured(request: AiStructuredRequest): Promise<unknown>;
  generateImage(request: AiImageRequest): Promise<never>;
  generateVideo(request: AiVideoRequest): Promise<never>;
  generateImageToVideo(request: AiImageToVideoRequest): Promise<never>;
  generateSpeech(request: AiSpeechRequest): Promise<never>;
  generateVoiceClone(request: AiVoiceCloneRequest): Promise<never>;
  generateMusic(request: AiMusicRequest): Promise<never>;
  generateEmbedding(request: AiEmbeddingRequest): Promise<never>;
  testConnection(): Promise<void>;
}
