import type {
  GeneratedAudio,
  ImageGenerationResult,
  VideoGenerationResult,
} from "@ai-drama-studio/types";

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
  maxTokens?: number;
}

export interface AiImageRequest {
  prompt: string;
  model?: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  size?: string;
  n?: number;
  seed?: number;
  responseFormat?: "url" | "b64_json";
}

export interface AiVideoRequest {
  prompt: string;
  model?: string;
  negativePrompt?: string;
  imageUrl?: string;
  imageBase64?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  fps?: number;
  cameraMovement?: string;
  seed?: number;
  metadata?: Record<string, unknown>;
}

export interface AiImageToVideoRequest {
  prompt: string;
  imageUrl?: string;
  imageBase64?: string;
  model?: string;
  negativePrompt?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  fps?: number;
  cameraMovement?: string;
  seed?: number;
}

export interface AiSpeechRequest {
  text: string;
  model?: string;
  voice?: string;
  language?: string;
  format?: string;
  speed?: number;
  pitch?: number;
}

export interface AiVoiceCloneRequest {
  text: string;
  referenceUrl?: string;
  model?: string;
}

export interface AiMusicRequest {
  prompt: string;
  model?: string;
  durationSeconds?: number;
  style?: string;
  mood?: string;
  genre?: string;
  instrumentation?: string;
  tempo?: string;
  language?: string;
  isInstrumental?: boolean;
  negativePrompt?: string;
  title?: string;
  loopable?: boolean;
  intensity?: string;
}

export interface AiSfxRequest {
  prompt: string;
  model?: string;
  durationSeconds?: number;
  category?: string;
  intensity?: string;
  negativePrompt?: string;
}

export interface AiEmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface AiProvider {
  readonly name: string;
  generateText(request: AiTextRequest): Promise<string>;
  generateStructured(request: AiStructuredRequest): Promise<unknown>;
  generateImage(request: AiImageRequest): Promise<ImageGenerationResult>;
  generateVideo(request: AiVideoRequest): Promise<VideoGenerationResult>;
  generateImageToVideo(request: AiImageToVideoRequest): Promise<VideoGenerationResult>;
  generateSpeech(request: AiSpeechRequest): Promise<GeneratedAudio>;
  generateVoiceClone(request: AiVoiceCloneRequest): Promise<never>;
  generateMusic(request: AiMusicRequest): Promise<GeneratedAudio>;
  generateSfx(request: AiSfxRequest): Promise<GeneratedAudio>;
  generateEmbedding(request: AiEmbeddingRequest): Promise<never>;
  testConnection(): Promise<void>;
}
