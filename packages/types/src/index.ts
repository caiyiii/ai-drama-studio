export enum ProjectStatus {
  DRAFT = "DRAFT",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export enum ProjectStep {
  WORLD = "WORLD",
  CHARACTERS = "CHARACTERS",
  LOCATIONS = "LOCATIONS",
  EPISODES = "EPISODES",
  SCRIPT = "SCRIPT",
  STORYBOARD = "STORYBOARD",
  IMAGES = "IMAGES",
  VIDEOS = "VIDEOS",
  VOICES = "VOICES",
  RENDER = "RENDER",
}

export const PROJECT_GENRES = [
  "科幻",
  "修仙",
  "赛博朋克",
  "都市",
  "爱情",
  "悬疑",
  "玄幻",
  "其他",
] as const;

export type ProjectGenre = (typeof PROJECT_GENRES)[number];

export enum AssetType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  DOCUMENT = "DOCUMENT",
  OTHER = "OTHER",
}

export enum GenerationTaskType {
  WORLD = "WORLD",
  SCRIPT = "SCRIPT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  VOICE = "VOICE",
  STORYBOARD = "STORYBOARD",
}

export const GenerationType = GenerationTaskType;
export type GenerationType = GenerationTaskType;

export enum GenerationTaskStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export const GenerationStatus = GenerationTaskStatus;
export type GenerationStatus = GenerationTaskStatus;

export const WORLD_GENERATION_STYLES = [
  "史诗",
  "克制",
  "黑暗",
  "奇幻",
  "硬科幻",
] as const;

export type WorldGenerationStyle = (typeof WORLD_GENERATION_STYLES)[number];

export const WORLD_GENERATION_DETAIL_LEVELS = ["简要", "标准", "详尽"] as const;

export type WorldGenerationDetailLevel =
  (typeof WORLD_GENERATION_DETAIL_LEVELS)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  genre: string | null;
  cover: string | null;
  status: ProjectStatus;
  currentStep: ProjectStep;
  userId: string;
  aiProviderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Episode {
  id: string;
  projectId: string;
  title: string;
  synopsis: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  projectId: string;
  type: AssetType;
  name: string;
  url: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationTask {
  id: string;
  projectId: string;
  type: GenerationTaskType;
  status: GenerationTaskStatus;
  provider: string | null;
  model: string | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  genre?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  genre?: string;
  cover?: string | null;
  status?: ProjectStatus;
  currentStep?: ProjectStep;
}

export interface HealthResponse {
  status: "ok";
}

export interface World {
  id: string;
  projectId: string;
  title: string;
  summary: string | null;
  cosmicBackground: string | null;
  coreConflict: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Civilization {
  id: string;
  worldId: string;
  name: string;
  description: string | null;
  origin: string | null;
  philosophy: string | null;
  society: string | null;
  culture: string | null;
  technology: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorldHistory {
  id: string;
  worldId: string;
  title: string;
  description: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Faction {
  id: string;
  worldId: string;
  civilizationId: string | null;
  name: string;
  description: string | null;
  type: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorldLocation {
  id: string;
  worldId: string;
  civilizationId: string | null;
  name: string;
  description: string | null;
  type: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PowerSystemLevel {
  name: string;
  description?: string;
}

export interface PowerSystem {
  id: string;
  worldId: string;
  name: string;
  description: string | null;
  rules: string[];
  levels: PowerSystemLevel[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorldInput {
  title: string;
  summary?: string;
  cosmicBackground?: string;
  coreConflict?: string;
}

export interface UpdateWorldInput {
  title?: string;
  summary?: string;
  cosmicBackground?: string;
  coreConflict?: string;
}

export interface CreateCivilizationInput {
  name: string;
  description?: string;
  origin?: string;
  philosophy?: string;
  society?: string;
  culture?: string;
  technology?: string;
}

export type UpdateCivilizationInput = Partial<CreateCivilizationInput>;

export interface CreateWorldHistoryInput {
  title: string;
  description?: string;
  order?: number;
}

export interface UpdateWorldHistoryInput {
  title?: string;
  description?: string;
  order?: number;
}

export interface CreateFactionInput {
  name: string;
  description?: string;
  type?: string;
  civilizationId?: string | null;
}

export type UpdateFactionInput = Partial<CreateFactionInput>;

export interface CreateWorldLocationInput {
  name: string;
  description?: string;
  type?: string;
  civilizationId?: string | null;
}

export type UpdateWorldLocationInput = Partial<CreateWorldLocationInput>;

export interface CreatePowerSystemInput {
  name: string;
  description?: string;
  rules?: string[];
  levels?: PowerSystemLevel[];
}

export type UpdatePowerSystemInput = Partial<CreatePowerSystemInput>;

export interface WorldGenerationInput {
  prompt: string;
  style?: WorldGenerationStyle | string;
  detailLevel?: WorldGenerationDetailLevel | string;
}

export interface WorldGenerationCivilization {
  name: string;
  type: string;
  description: string;
  philosophy: string;
  society: string;
  culture: string;
  technology: string;
}

export interface WorldGenerationHistory {
  title: string;
  description: string;
  order: number;
}

export interface WorldGenerationFaction {
  name: string;
  description: string;
  civilizationName: string;
}

export interface WorldGenerationLocation {
  name: string;
  description: string;
  civilizationName: string;
}

export interface WorldGenerationPowerSystem {
  name: string;
  description: string;
  rules: string[];
  levels: PowerSystemLevel[];
}

export interface WorldGenerationResult {
  world: {
    name: string;
    description: string;
    cosmicBackground: string;
    coreConflict: string;
  };
  civilizations: WorldGenerationCivilization[];
  histories: WorldGenerationHistory[];
  factions: WorldGenerationFaction[];
  locations: WorldGenerationLocation[];
  powerSystems: WorldGenerationPowerSystem[];
}

export enum AIProviderKind {
  OPENAI_COMPATIBLE = "OPENAI_COMPATIBLE",
  OPENAI = "OPENAI",
  DEEPSEEK = "DEEPSEEK",
  QWEN = "QWEN",
  GEMINI = "GEMINI",
  CLAUDE = "CLAUDE",
}

export const AI_PROVIDER_KIND_LABELS: Record<AIProviderKind, string> = {
  [AIProviderKind.OPENAI_COMPATIBLE]: "OpenAI Compatible",
  [AIProviderKind.OPENAI]: "OpenAI",
  [AIProviderKind.DEEPSEEK]: "DeepSeek",
  [AIProviderKind.QWEN]: "Qwen",
  [AIProviderKind.GEMINI]: "Gemini",
  [AIProviderKind.CLAUDE]: "Claude",
};

export const SUPPORTED_AI_PROVIDER_KINDS: AIProviderKind[] = [
  AIProviderKind.OPENAI_COMPATIBLE,
];

export const SYSTEM_AI_PROVIDER_ID = "system";

export type AIProviderSource = "project" | "default" | "system";

export interface AIProvider {
  id: string;
  name: string;
  provider: AIProviderKind;
  baseUrl: string;
  model: string;
  isDefault: boolean;
  enabled: boolean;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAIProviderInput {
  name: string;
  provider: AIProviderKind;
  baseUrl: string;
  apiKey: string;
  model: string;
  isDefault?: boolean;
  enabled?: boolean;
}

export interface UpdateAIProviderInput {
  name?: string;
  provider?: AIProviderKind;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  isDefault?: boolean;
  enabled?: boolean;
}

export interface AIProviderTestInput {
  provider: AIProviderKind;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface AIProviderTestResult {
  success: boolean;
  code?: string;
  message?: string;
}

export interface ProjectAIProvider {
  aiProviderId: string | null;
  selected: AIProvider | null;
  resolved: {
    source: AIProviderSource;
    provider: AIProvider;
  } | null;
}
