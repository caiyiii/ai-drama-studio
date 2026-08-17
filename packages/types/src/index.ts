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
  CHARACTER = "CHARACTER",
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

export interface CharacterRef {
  id: string;
  name: string;
  alias: string | null;
  role: string | null;
}

export interface CharacterCivilizationRef {
  id: string;
  name: string;
}

export interface CharacterFactionRef {
  id: string;
  name: string;
}

export enum CharacterStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum CharacterRelationType {
  FRIEND = "FRIEND",
  ENEMY = "ENEMY",
  ALLY = "ALLY",
  RIVAL = "RIVAL",
  MASTER = "MASTER",
  DISCIPLE = "DISCIPLE",
  FAMILY = "FAMILY",
  LOVER = "LOVER",
  COLLEAGUE = "COLLEAGUE",
  TEACHER = "TEACHER",
  STUDENT = "STUDENT",
  PARTNER = "PARTNER",
  UNKNOWN = "UNKNOWN",
  MASTER_STUDENT = "MASTER_STUDENT",
  SUPERIOR_SUBORDINATE = "SUPERIOR_SUBORDINATE",
  ACQUAINTANCE = "ACQUAINTANCE",
  OTHER = "OTHER",
}

export const RelationshipType = CharacterRelationType;
export type RelationshipType = CharacterRelationType;

export const CHARACTER_STATUS_LABELS: Record<CharacterStatus, string> = {
  [CharacterStatus.ACTIVE]: "活跃",
  [CharacterStatus.INACTIVE]: "停用",
  [CharacterStatus.ARCHIVED]: "归档",
};

export const CHARACTER_RELATION_TYPE_LABELS: Record<CharacterRelationType, string> = {
  [CharacterRelationType.FRIEND]: "朋友",
  [CharacterRelationType.ENEMY]: "敌对",
  [CharacterRelationType.ALLY]: "盟友",
  [CharacterRelationType.RIVAL]: "竞争对手",
  [CharacterRelationType.MASTER]: "师父",
  [CharacterRelationType.DISCIPLE]: "弟子",
  [CharacterRelationType.FAMILY]: "家人",
  [CharacterRelationType.LOVER]: "恋人",
  [CharacterRelationType.COLLEAGUE]: "同事",
  [CharacterRelationType.TEACHER]: "老师",
  [CharacterRelationType.STUDENT]: "学生",
  [CharacterRelationType.PARTNER]: "搭档",
  [CharacterRelationType.UNKNOWN]: "未知",
  [CharacterRelationType.MASTER_STUDENT]: "师徒",
  [CharacterRelationType.SUPERIOR_SUBORDINATE]: "上下级",
  [CharacterRelationType.ACQUAINTANCE]: "相识",
  [CharacterRelationType.OTHER]: "其他",
};

export interface CharacterVoiceProfile {
  voiceId?: string | null;
  providerId?: string | null;
  modelId?: string | null;
  language?: string | null;
  gender?: string | null;
  style?: string | null;
}

export interface CharacterImageProfile {
  visualStyle?: string | null;
  referencePrompt?: string | null;
  negativePrompt?: string | null;
  identityPrompt?: string | null;
  seed?: string | number | null;
  referenceAssetId?: string | null;
  consistencyConfig?: Record<string, unknown> | null;
}

export interface Character {
  id: string;
  projectId: string;
  worldId: string | null;
  civilizationId: string | null;
  factionId: string | null;
  name: string;
  alias: string | null;
  gender: string | null;
  age: number | null;
  race: string | null;
  identity: string | null;
  role: string | null;
  description: string | null;
  personality: string | null;
  appearance: string | null;
  background: string | null;
  motivation: string | null;
  goal: string | null;
  conflict: string | null;
  ability: string | null;
  personalityProfile: Record<string, unknown> | null;
  appearanceProfile: Record<string, unknown> | null;
  abilities: unknown[] | null;
  voiceProfile: CharacterVoiceProfile | null;
  imageProfile: CharacterImageProfile | null;
  metadata: Record<string, unknown> | null;
  status: CharacterStatus;
  createdAt: string;
  updatedAt: string;
  civilization: CharacterCivilizationRef | null;
  faction: CharacterFactionRef | null;
}

export interface CharacterInput {
  name: string;
  alias?: string | null;
  gender?: string | null;
  age?: number | null;
  race?: string | null;
  identity?: string | null;
  role?: string | null;
  civilizationId?: string | null;
  factionId?: string | null;
  description?: string | null;
  personality?: string | null;
  appearance?: string | null;
  background?: string | null;
  motivation?: string | null;
  goal?: string | null;
  conflict?: string | null;
  ability?: string | null;
  status?: CharacterStatus;
}

export type CharacterUpdateInput = Partial<CharacterInput>;
export type UpdateCharacterInput = CharacterUpdateInput;

export interface CharacterListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  civilizationId?: string;
  factionId?: string;
}

export interface CharacterListResult {
  items: Character[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CharacterRelationship {
  id: string;
  projectId: string;
  fromCharacterId: string;
  toCharacterId: string;
  type: CharacterRelationType;
  label: string | null;
  description: string | null;
  strength: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  fromCharacter: CharacterRef;
  toCharacter: CharacterRef;
}

export interface CharacterRelationshipInput {
  fromCharacterId: string;
  toCharacterId: string;
  type: CharacterRelationType;
  label?: string | null;
  description?: string | null;
  strength?: number;
}

export interface CharacterRelationshipUpdateInput {
  type?: CharacterRelationType;
  label?: string | null;
  description?: string | null;
  strength?: number;
}

export type UpdateCharacterRelationshipInput = CharacterRelationshipUpdateInput;

export interface CharacterContext {
  name: string;
  alias: string | null;
  gender: string | null;
  age: number | null;
  role: string | null;
  status: CharacterStatus;
  civilization: string | null;
  faction: string | null;
  description: string | null;
  personality: string | null;
  appearance: string | null;
  background: string | null;
  motivation: string | null;
  goal: string | null;
  ability: string | null;
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

export interface GenerationTaskUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  estimatedCost?: number;
}

export interface GenerationTask {
  id: string;
  projectId: string;
  type: GenerationTaskType;
  status: GenerationTaskStatus;
  capability?: AiCapability | null;
  provider: string | null;
  model: string | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  usage?: GenerationTaskUsage | null;
  appliedAt?: string | null;
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

export const CHARACTER_GENERATION_STYLES = [
  "东方玄幻",
  "赛博朋克",
  "科幻",
  "现代",
  "其他",
] as const;

export type CharacterGenerationStyle =
  (typeof CHARACTER_GENERATION_STYLES)[number];

export const CHARACTER_GENERATION_DETAIL_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
] as const;

export type CharacterGenerationDetailLevel =
  (typeof CHARACTER_GENERATION_DETAIL_LEVELS)[number];

export interface CharacterGenerationInput {
  prompt: string;
  style?: CharacterGenerationStyle | string;
  detailLevel?: CharacterGenerationDetailLevel | string;
  name?: string;
  role?: string;
  gender?: string;
  age?: number | string;
  civilizationId?: string | null;
  factionId?: string | null;
  personality?: string;
  appearance?: string;
  background?: string;
  goal?: string;
  motivation?: string;
  conflict?: string;
}

export interface CharacterGenerationCharacter {
  name: string;
  alias: string;
  gender: string;
  age: string;
  race: string;
  identity: string;
  role: string;
  personality: Record<string, unknown>;
  appearance: Record<string, unknown>;
  background: string;
  goal: string;
  motivation: string;
  conflict: string;
  abilities: unknown[];
  civilizationName?: string;
  factionName?: string;
}

export interface CharacterGenerationRelationship {
  targetName: string;
  type: string;
  label?: string;
  description?: string;
  strength?: number;
}

export interface CharacterGenerationResult {
  character: CharacterGenerationCharacter;
  relationships: CharacterGenerationRelationship[];
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

export type AIProviderSource = "project" | "user" | "default" | "system";

export type CapabilityProviderSource = "PROJECT" | "USER" | "PLATFORM" | "SYSTEM";

export enum AiCapability {
  CHAT = "CHAT",
  STRUCTURED_OUTPUT = "STRUCTURED_OUTPUT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  IMAGE_TO_VIDEO = "IMAGE_TO_VIDEO",
  TTS = "TTS",
  VOICE_CLONE = "VOICE_CLONE",
  MUSIC = "MUSIC",
  EMBEDDING = "EMBEDDING",
}

export const AI_CAPABILITIES = [
  AiCapability.CHAT,
  AiCapability.STRUCTURED_OUTPUT,
  AiCapability.IMAGE,
  AiCapability.VIDEO,
  AiCapability.IMAGE_TO_VIDEO,
  AiCapability.TTS,
  AiCapability.VOICE_CLONE,
  AiCapability.MUSIC,
  AiCapability.EMBEDDING,
] as const;

export interface AIProvider {
  id: string;
  name: string;
  provider: AIProviderKind;
  baseUrl: string;
  model: string;
  isDefault: boolean;
  enabled: boolean;
  hasApiKey: boolean;
  capabilities: AiCapability[];
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
  capabilities?: AiCapability[];
}

export interface UpdateAIProviderInput {
  name?: string;
  provider?: AIProviderKind;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  isDefault?: boolean;
  enabled?: boolean;
  capabilities?: AiCapability[];
}

export interface AiCapabilityDefinition {
  capability: AiCapability;
  label: string;
  implemented: boolean;
}

export interface ProjectAiCapabilitySummary {
  providerId?: string | null;
  providerName?: string | null;
  model?: string | null;
  source?: CapabilityProviderSource;
  configured: boolean;
  implemented?: boolean;
  code?: string;
}

export type ProjectAiConfigMap = Record<AiCapability, ProjectAiCapabilitySummary>;

export interface SetProjectAiConfigInput {
  providerId?: string | null;
  modelId?: string | null;
}

export interface AiModel {
  id: string;
  providerId: string;
  name: string;
  modelId: string;
  capabilities: AiCapability[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAiConfig {
  id: string;
  projectId: string;
  capability: AiCapability;
  providerId: string | null;
  modelId: string | null;
  createdAt: string;
  updatedAt: string;
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
