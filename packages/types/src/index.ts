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

export enum AssetStatus {
  PENDING = "PENDING",
  READY = "READY",
  FAILED = "FAILED",
  DELETED = "DELETED",
}

export enum StoryboardShotAssetRole {
  REFERENCE = "REFERENCE",
  GENERATED = "GENERATED",
  FINAL = "FINAL",
  THUMBNAIL = "THUMBNAIL",
}

export enum ScriptBlockAssetRole {
  REFERENCE = "REFERENCE",
  GENERATED = "GENERATED",
  FINAL = "FINAL",
}

export enum AudioAssetRole {
  MUSIC = "MUSIC",
  SFX = "SFX",
  REFERENCE = "REFERENCE",
  FINAL = "FINAL",
}

export enum GenerationTaskType {
  WORLD = "WORLD",
  CHARACTER = "CHARACTER",
  STORY_BIBLE = "STORY_BIBLE",
  SEASON_OUTLINE = "SEASON_OUTLINE",
  EPISODE_OUTLINE = "EPISODE_OUTLINE",
  SCRIPT = "SCRIPT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  IMAGE_TO_VIDEO = "IMAGE_TO_VIDEO",
  VOICE = "VOICE",
  TTS = "TTS",
  MUSIC = "MUSIC",
  SFX = "SFX",
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
  seasonId: string;
  number: number;
  title: string;
  synopsis: string | null;
  outline: string | null;
  status: EpisodeStatus;
  durationSeconds: number | null;
  storyState: EpisodeStoryState | null;
  continuityNotes: string | null;
  metadata: Record<string, unknown> | null;
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
  speed?: number | null;
  pitch?: number | null;
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
  voiceProfile?: CharacterVoiceProfile | null;
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
  status: AssetStatus;
  name: string;
  mimeType: string | null;
  storageKey: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  provider: string | null;
  model: string | null;
  version: number;
  generationTaskId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoryboardShotAsset {
  id: string;
  shotId: string;
  assetId: string;
  role: StoryboardShotAssetRole;
  isPrimary: boolean;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  asset?: Asset;
}

export interface ScriptBlockAsset {
  id: string;
  scriptBlockId: string;
  assetId: string;
  role: ScriptBlockAssetRole;
  isPrimary: boolean;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  asset?: Asset;
}

export type ScriptBlockAudioAsset = ScriptBlockAsset;

export interface EpisodeAudioAsset {
  id: string;
  episodeId: string;
  assetId: string;
  role: AudioAssetRole;
  isPrimary: boolean;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  asset?: Asset;
}

export interface GenerationTaskUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  durationMs?: number;
  estimatedCost?: number;
  shotCount?: number;
  sceneCount?: number;
  imageCount?: number;
  sourceShotId?: string;
  sourceAssetId?: string;
  outputAssetCount?: number;
  characterCount?: number;
  audioDurationSeconds?: number;
  sizeBytes?: number;
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
  SFX = "SFX",
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
  AiCapability.SFX,
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

export enum SeasonStatus {
  DRAFT = "DRAFT",
  PLANNING = "PLANNING",
  READY = "READY",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export const SEASON_STATUS_LABELS: Record<SeasonStatus, string> = {
  [SeasonStatus.DRAFT]: "草稿",
  [SeasonStatus.PLANNING]: "规划中",
  [SeasonStatus.READY]: "已就绪",
  [SeasonStatus.IN_PROGRESS]: "制作中",
  [SeasonStatus.COMPLETED]: "已完成",
  [SeasonStatus.ARCHIVED]: "已归档",
};

export enum EpisodeStatus {
  DRAFT = "DRAFT",
  OUTLINED = "OUTLINED",
  SCRIPTING = "SCRIPTING",
  READY = "READY",
  IN_PRODUCTION = "IN_PRODUCTION",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export const EPISODE_STATUS_LABELS: Record<EpisodeStatus, string> = {
  [EpisodeStatus.DRAFT]: "草稿",
  [EpisodeStatus.OUTLINED]: "已有大纲",
  [EpisodeStatus.SCRIPTING]: "编剧中",
  [EpisodeStatus.READY]: "已就绪",
  [EpisodeStatus.IN_PRODUCTION]: "制作中",
  [EpisodeStatus.COMPLETED]: "已完成",
  [EpisodeStatus.ARCHIVED]: "已归档",
};

export interface StoryBibleRules {
  worldRules: string[];
  characterRules: string[];
  narrativeRules: string[];
  forbidden: string[];
}

export interface StoryBible {
  id: string;
  projectId: string;
  title: string;
  logline: string | null;
  premise: string | null;
  theme: string | null;
  tone: string | null;
  style: string | null;
  audience: string | null;
  storyPromise: string | null;
  rules: StoryBibleRules | null;
  timelineSummary: string | null;
  continuityNotes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoryBibleInput {
  title: string;
  logline?: string | null;
  premise?: string | null;
  theme?: string | null;
  tone?: string | null;
  style?: string | null;
  audience?: string | null;
  storyPromise?: string | null;
  rules?: StoryBibleRules | null;
  timelineSummary?: string | null;
  continuityNotes?: string | null;
}

export type UpdateStoryBibleInput = Partial<StoryBibleInput>;

export interface Season {
  id: string;
  projectId: string;
  number: number;
  title: string;
  synopsis: string | null;
  outline: string | null;
  status: SeasonStatus;
  metadata: Record<string, unknown> | null;
  episodeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SeasonInput {
  number: number;
  title: string;
  synopsis?: string | null;
  outline?: string | null;
  status?: SeasonStatus;
}

export type UpdateSeasonInput = Partial<SeasonInput>;

export interface EpisodeStoryStateCharacter {
  characterId?: string;
  name?: string;
  state?: string;
  location?: string;
  condition?: string;
  goal?: string;
}

export interface EpisodeStoryState {
  characters?: EpisodeStoryStateCharacter[];
  relationships?: unknown[];
  worldChanges?: unknown[];
  factionChanges?: unknown[];
  unresolvedThreads?: unknown[];
  revealedSecrets?: unknown[];
  foreshadowing?: unknown[];
}

export interface EpisodeInput {
  number: number;
  title: string;
  synopsis?: string | null;
  outline?: string | null;
  status?: EpisodeStatus;
  durationSeconds?: number | null;
  storyState?: EpisodeStoryState | null;
  continuityNotes?: string | null;
}

export type UpdateEpisodeInput = Partial<EpisodeInput>;

export interface ReorderEpisodesInput {
  ids: string[];
}

export interface StoryWorldSummary {
  title: string;
  summary: string | null;
  cosmicBackground: string | null;
  coreConflict: string | null;
}

export interface StoryCivilizationSummary {
  name: string;
  description: string | null;
  philosophy: string | null;
  technology: string | null;
}

export interface StoryFactionSummary {
  name: string;
  description: string | null;
}

export interface StoryLocationSummary {
  name: string;
  description: string | null;
}

export interface StoryPowerSystemSummary {
  name: string;
  description: string | null;
}

export interface StoryCharacterSummary {
  id: string;
  name: string;
  role: string | null;
  identity: string | null;
  personality: string | null;
  goal: string | null;
  conflict: string | null;
  appearance?: string | null;
  visualSummary?: string | null;
  abilities?: string | null;
  civilization?: string | null;
  faction?: string | null;
}

export interface StoryRelationshipSummary {
  fromName: string;
  toName: string;
  type: string;
  label: string | null;
}

export interface StorySeasonSummary {
  id: string;
  number: number;
  title: string;
  synopsis: string | null;
  outline: string | null;
  status: SeasonStatus;
}

export interface StoryEpisodeSummary {
  id: string;
  number: number;
  title: string;
  synopsis: string | null;
  outline: string | null;
  status: EpisodeStatus;
  storyState: EpisodeStoryState | null;
  continuityNotes?: string | null;
}

export interface StoryContext {
  project?: {
    name: string;
    description: string | null;
    genre: string | null;
  } | null;
  storyBible: StoryBible | null;
  world: StoryWorldSummary | null;
  civilizations: StoryCivilizationSummary[];
  factions: StoryFactionSummary[];
  locations: StoryLocationSummary[];
  powerSystems: StoryPowerSystemSummary[];
  characters: StoryCharacterSummary[];
  relationships: StoryRelationshipSummary[];
  seasons: StorySeasonSummary[];
  episodes: StoryEpisodeSummary[];
  season?: StorySeasonSummary | null;
  episode?: StoryEpisodeSummary | null;
  previousEpisode?: StoryEpisodeSummary | null;
  script?: StoryboardScriptContext | null;
}

export interface StoryBibleGenerationInput {
  instruction: string;
  tone?: string;
  style?: string;
  audience?: string;
}

export interface StoryBibleGenerationResult {
  title: string;
  logline: string;
  premise: string;
  theme: string;
  tone: string;
  style: string;
  audience: string;
  storyPromise: string;
  rules: StoryBibleRules;
  timelineSummary: string;
  continuityNotes: string[];
}

export interface SeasonGenerationInput {
  seasonId: string;
  instruction?: string;
  episodeCount?: number;
  targetDurationSeconds?: number;
}

export interface SeasonGenerationEpisode {
  number: number;
  title: string;
  synopsis: string;
  outline: string;
  keyCharacters: string[];
  keyLocations: string[];
  conflict: string;
  cliffhanger: string;
  storyStateChanges: EpisodeStoryState;
}

export interface SeasonGenerationResult {
  season: {
    title: string;
    synopsis: string;
    coreConflict: string;
    beginning: string;
    middle: string;
    ending: string;
  };
  episodes: SeasonGenerationEpisode[];
}

export interface EpisodeGenerationInput {
  episodeId: string;
  instruction?: string;
}

export interface EpisodeGenerationResult {
  title: string;
  synopsis: string;
  outline: string;
  opening: string;
  middle: string;
  ending: string;
  cliffhanger: string;
  keyCharacters: string[];
  keyLocations: string[];
  conflict: string;
  storyState: EpisodeStoryState;
}

export interface ContinuityCheckResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export enum ScriptStatus {
  DRAFT = "DRAFT",
  GENERATING = "GENERATING",
  READY = "READY",
  LOCKED = "LOCKED",
}

export const SCRIPT_STATUS_LABELS: Record<ScriptStatus, string> = {
  [ScriptStatus.DRAFT]: "草稿",
  [ScriptStatus.GENERATING]: "生成中",
  [ScriptStatus.READY]: "已就绪",
  [ScriptStatus.LOCKED]: "已锁定",
};

export enum ScriptBlockType {
  DIALOGUE = "DIALOGUE",
  ACTION = "ACTION",
  NARRATION = "NARRATION",
  DIRECTION = "DIRECTION",
}

export const SCRIPT_BLOCK_TYPE_LABELS: Record<ScriptBlockType, string> = {
  [ScriptBlockType.DIALOGUE]: "对白",
  [ScriptBlockType.ACTION]: "动作",
  [ScriptBlockType.NARRATION]: "旁白",
  [ScriptBlockType.DIRECTION]: "指示",
};

export interface ScriptBlock {
  id: string;
  sceneId: string;
  order: number;
  type: ScriptBlockType;
  content: string;
  characterId: string | null;
  character?: CharacterRef | null;
  metadata: Record<string, unknown> | null;
  assets?: ScriptBlockAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  scriptId: string;
  number: number;
  title: string;
  location: string | null;
  timeOfDay: string | null;
  summary: string | null;
  purpose: string | null;
  conflict: string | null;
  estimatedDurationSeconds: number | null;
  metadata: Record<string, unknown> | null;
  blocks?: ScriptBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface Script {
  id: string;
  episodeId: string;
  projectId: string;
  title: string;
  version: number;
  status: ScriptStatus;
  logline: string | null;
  summary: string | null;
  estimatedDurationSeconds: number | null;
  metadata: Record<string, unknown> | null;
  scenes?: Scene[];
  createdAt: string;
  updatedAt: string;
}

export interface ScriptInput {
  title: string;
  logline?: string | null;
  summary?: string | null;
  estimatedDurationSeconds?: number | null;
  status?: ScriptStatus;
}

export type UpdateScriptInput = Partial<ScriptInput>;

export interface SceneInput {
  number: number;
  title: string;
  location?: string | null;
  timeOfDay?: string | null;
  summary?: string | null;
  purpose?: string | null;
  conflict?: string | null;
  estimatedDurationSeconds?: number | null;
}

export type UpdateSceneInput = Partial<SceneInput>;

export interface ScriptBlockInput {
  order: number;
  type: ScriptBlockType;
  content: string;
  characterId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type UpdateScriptBlockInput = Partial<ScriptBlockInput>;

export interface ReorderScenesInput {
  ids: string[];
}

export interface ReorderScriptBlocksInput {
  ids: string[];
}

export interface ScriptGenerationInput {
  episodeId: string;
  prompt?: string;
  tone?: string;
  style?: string;
  targetDurationSeconds?: number;
  additionalInstructions?: string;
}

export interface ScriptGenerationBlock {
  order: number;
  type: ScriptBlockType;
  characterName: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface ScriptGenerationScene {
  number: number;
  title: string;
  location: string;
  timeOfDay: string;
  summary: string;
  purpose: string;
  conflict: string;
  estimatedDurationSeconds: number;
  blocks: ScriptGenerationBlock[];
}

export interface ScriptGenerationResult {
  script: {
    title: string;
    logline: string;
    summary: string;
    estimatedDurationSeconds: number;
  };
  scenes: ScriptGenerationScene[];
}

export enum StoryboardStatus {
  DRAFT = "DRAFT",
  GENERATING = "GENERATING",
  READY = "READY",
  LOCKED = "LOCKED",
  STALE = "STALE",
}

export const STORYBOARD_STATUS_LABELS: Record<StoryboardStatus, string> = {
  [StoryboardStatus.DRAFT]: "草稿",
  [StoryboardStatus.GENERATING]: "生成中",
  [StoryboardStatus.READY]: "已就绪",
  [StoryboardStatus.LOCKED]: "已锁定",
  [StoryboardStatus.STALE]: "已过期",
};

export enum StoryboardShotType {
  ESTABLISHING = "ESTABLISHING",
  WIDE = "WIDE",
  FULL = "FULL",
  MEDIUM = "MEDIUM",
  MEDIUM_CLOSE_UP = "MEDIUM_CLOSE_UP",
  CLOSE_UP = "CLOSE_UP",
  EXTREME_CLOSE_UP = "EXTREME_CLOSE_UP",
  OVER_SHOULDER = "OVER_SHOULDER",
  POV = "POV",
  TWO_SHOT = "TWO_SHOT",
  INSERT = "INSERT",
  AERIAL = "AERIAL",
  DYNAMIC = "DYNAMIC",
}

export const STORYBOARD_SHOT_TYPE_LABELS: Record<StoryboardShotType, string> = {
  [StoryboardShotType.ESTABLISHING]: "建立镜头",
  [StoryboardShotType.WIDE]: "远景",
  [StoryboardShotType.FULL]: "全景",
  [StoryboardShotType.MEDIUM]: "中景",
  [StoryboardShotType.MEDIUM_CLOSE_UP]: "中近景",
  [StoryboardShotType.CLOSE_UP]: "特写",
  [StoryboardShotType.EXTREME_CLOSE_UP]: "大特写",
  [StoryboardShotType.OVER_SHOULDER]: "过肩",
  [StoryboardShotType.POV]: "主观",
  [StoryboardShotType.TWO_SHOT]: "双人",
  [StoryboardShotType.INSERT]: "插入",
  [StoryboardShotType.AERIAL]: "航拍",
  [StoryboardShotType.DYNAMIC]: "动态",
};

export enum StoryboardShotSize {
  EXTREME_WIDE = "EXTREME_WIDE",
  WIDE = "WIDE",
  FULL = "FULL",
  MEDIUM = "MEDIUM",
  MEDIUM_CLOSE_UP = "MEDIUM_CLOSE_UP",
  CLOSE_UP = "CLOSE_UP",
  EXTREME_CLOSE_UP = "EXTREME_CLOSE_UP",
}

export const STORYBOARD_SHOT_SIZE_LABELS: Record<StoryboardShotSize, string> = {
  [StoryboardShotSize.EXTREME_WIDE]: "大远景",
  [StoryboardShotSize.WIDE]: "远景",
  [StoryboardShotSize.FULL]: "全景",
  [StoryboardShotSize.MEDIUM]: "中景",
  [StoryboardShotSize.MEDIUM_CLOSE_UP]: "中近景",
  [StoryboardShotSize.CLOSE_UP]: "特写",
  [StoryboardShotSize.EXTREME_CLOSE_UP]: "大特写",
};

export enum CameraMovement {
  STATIC = "STATIC",
  PAN = "PAN",
  TILT = "TILT",
  DOLLY_IN = "DOLLY_IN",
  DOLLY_OUT = "DOLLY_OUT",
  TRUCK_LEFT = "TRUCK_LEFT",
  TRUCK_RIGHT = "TRUCK_RIGHT",
  CRANE_UP = "CRANE_UP",
  CRANE_DOWN = "CRANE_DOWN",
  ZOOM_IN = "ZOOM_IN",
  ZOOM_OUT = "ZOOM_OUT",
  HANDHELD = "HANDHELD",
  ORBIT = "ORBIT",
  FOLLOW = "FOLLOW",
  TRACKING = "TRACKING",
}

export const CAMERA_MOVEMENT_LABELS: Record<CameraMovement, string> = {
  [CameraMovement.STATIC]: "固定",
  [CameraMovement.PAN]: "横摇",
  [CameraMovement.TILT]: "俯仰",
  [CameraMovement.DOLLY_IN]: "推进",
  [CameraMovement.DOLLY_OUT]: "拉远",
  [CameraMovement.TRUCK_LEFT]: "左移",
  [CameraMovement.TRUCK_RIGHT]: "右移",
  [CameraMovement.CRANE_UP]: "升",
  [CameraMovement.CRANE_DOWN]: "降",
  [CameraMovement.ZOOM_IN]: "变焦推",
  [CameraMovement.ZOOM_OUT]: "变焦拉",
  [CameraMovement.HANDHELD]: "手持",
  [CameraMovement.ORBIT]: "环绕",
  [CameraMovement.FOLLOW]: "跟随",
  [CameraMovement.TRACKING]: "跟踪",
};

export enum CameraAngle {
  EYE_LEVEL = "EYE_LEVEL",
  LOW_ANGLE = "LOW_ANGLE",
  HIGH_ANGLE = "HIGH_ANGLE",
  BIRDS_EYE = "BIRDS_EYE",
  WORMS_EYE = "WORMS_EYE",
  DUTCH_ANGLE = "DUTCH_ANGLE",
  OVERHEAD = "OVERHEAD",
}

export const CAMERA_ANGLE_LABELS: Record<CameraAngle, string> = {
  [CameraAngle.EYE_LEVEL]: "平视",
  [CameraAngle.LOW_ANGLE]: "仰拍",
  [CameraAngle.HIGH_ANGLE]: "俯拍",
  [CameraAngle.BIRDS_EYE]: "鸟瞰",
  [CameraAngle.WORMS_EYE]: "虫视",
  [CameraAngle.DUTCH_ANGLE]: "荷兰角",
  [CameraAngle.OVERHEAD]: "顶拍",
};

export enum StoryboardTransition {
  CUT = "CUT",
  FADE_IN = "FADE_IN",
  FADE_OUT = "FADE_OUT",
  DISSOLVE = "DISSOLVE",
  WIPE = "WIPE",
  MATCH_CUT = "MATCH_CUT",
  SMASH_CUT = "SMASH_CUT",
}

export const STORYBOARD_TRANSITION_LABELS: Record<StoryboardTransition, string> = {
  [StoryboardTransition.CUT]: "切",
  [StoryboardTransition.FADE_IN]: "淡入",
  [StoryboardTransition.FADE_OUT]: "淡出",
  [StoryboardTransition.DISSOLVE]: "叠化",
  [StoryboardTransition.WIPE]: "划变",
  [StoryboardTransition.MATCH_CUT]: "匹配切",
  [StoryboardTransition.SMASH_CUT]: "硬切",
};

export interface StoryboardScriptBlockContext {
  id: string;
  order: number;
  type: ScriptBlockType;
  characterId: string | null;
  characterName: string | null;
  content: string;
}

export interface StoryboardSceneContext {
  id: string;
  number: number;
  title: string;
  location: string | null;
  timeOfDay: string | null;
  summary: string | null;
  blocks: StoryboardScriptBlockContext[];
}

export interface StoryboardScriptContext {
  id: string;
  version: number;
  status: ScriptStatus;
  title: string;
  scenes: StoryboardSceneContext[];
}

export interface StoryboardShot {
  id: string;
  storyboardId: string;
  sceneId: string | null;
  scriptBlockId: string | null;
  scriptBlockIds: string[];
  shotNumber: number;
  shotType: StoryboardShotType;
  shotSize: StoryboardShotSize;
  cameraMovement: CameraMovement;
  cameraAngle: CameraAngle;
  composition: string | null;
  visualDescription: string;
  characterIds: string[];
  location: string | null;
  action: string | null;
  dialogue: string | null;
  narration: string | null;
  direction: string | null;
  durationSeconds: number;
  transition: StoryboardTransition;
  lighting: string | null;
  mood: string | null;
  visualStyle: string | null;
  imagePrompt: string | null;
  videoPrompt: string | null;
  negativePrompt: string | null;
  continuityNotes: string | null;
  cameraMovementParams: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  assets?: StoryboardShotAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface Storyboard {
  id: string;
  episodeId: string;
  projectId: string;
  version: number;
  status: StoryboardStatus;
  title: string;
  description: string | null;
  totalDurationSeconds: number | null;
  sourceScriptVersion: number;
  stale: boolean;
  metadata: Record<string, unknown> | null;
  shots?: StoryboardShot[];
  createdAt: string;
  updatedAt: string;
}

export interface StoryboardInput {
  title: string;
  description?: string | null;
  status?: StoryboardStatus;
  totalDurationSeconds?: number | null;
}

export type UpdateStoryboardInput = Partial<StoryboardInput>;

export interface StoryboardShotInput {
  shotNumber: number;
  sceneId: string;
  scriptBlockId?: string | null;
  scriptBlockIds?: string[];
  shotType: StoryboardShotType;
  shotSize: StoryboardShotSize;
  cameraMovement: CameraMovement;
  cameraAngle: CameraAngle;
  composition?: string | null;
  visualDescription: string;
  characterIds?: string[];
  location?: string | null;
  action?: string | null;
  dialogue?: string | null;
  narration?: string | null;
  direction?: string | null;
  durationSeconds: number;
  transition?: StoryboardTransition;
  lighting?: string | null;
  mood?: string | null;
  visualStyle?: string | null;
  imagePrompt?: string | null;
  videoPrompt?: string | null;
  negativePrompt?: string | null;
  continuityNotes?: string | null;
  cameraMovementParams?: Record<string, unknown> | null;
}

export type UpdateStoryboardShotInput = Partial<
  Omit<StoryboardShotInput, "sceneId" | "scriptBlockId" | "scriptBlockIds">
>;

export interface ReorderStoryboardShotsInput {
  ids: string[];
}

export interface StoryboardGenerationInput {
  episodeId: string;
  prompt?: string;
  additionalInstructions?: string;
}

export interface StoryboardGenerationShot {
  shotNumber: number;
  sceneNumber: number;
  scriptBlockIds: string[];
  shotType: StoryboardShotType;
  shotSize: StoryboardShotSize;
  cameraMovement: CameraMovement;
  cameraAngle: CameraAngle;
  composition: string;
  visualDescription: string;
  characterIds: string[];
  location: string;
  action: string;
  dialogue: string;
  narration: string;
  direction: string;
  durationSeconds: number;
  transition: StoryboardTransition;
  lighting: string;
  mood: string;
  visualStyle: string;
  imagePrompt: string;
  videoPrompt: string;
  negativePrompt: string;
  continuityNotes: string;
}

export interface StoryboardGenerationResult {
  storyboard: {
    title: string;
    description: string;
    totalDurationSeconds: number;
  };
  shots: StoryboardGenerationShot[];
}

export const IMAGE_ASPECT_RATIOS = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "21:9",
] as const;

export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];

export const IMAGE_GENERATION_MIN_COUNT = 1;
export const IMAGE_GENERATION_MAX_COUNT = 4;

export interface ImageGenerationInput {
  shotId: string;
  promptOverride?: string;
  negativePromptOverride?: string;
  aspectRatio?: ImageAspectRatio;
  width?: number;
  height?: number;
  count?: number;
  seed?: number;
  style?: string;
  referenceAssetIds?: string[];
}

export interface ImageGenerationImage {
  url?: string;
  base64?: string;
  mimeType: string;
  width?: number;
  height?: number;
  seed?: number;
  revisedPrompt?: string;
  providerAssetId?: string;
  metadata?: Record<string, unknown>;
}

export interface ImageGenerationResult {
  images: ImageGenerationImage[];
  provider?: string;
  model?: string;
  requestedCount?: number;
  durationMs?: number;
}

export interface ImageGenerationMetadata {
  requestedWidth?: number;
  requestedHeight?: number;
  actualWidth?: number;
  actualHeight?: number;
  aspectRatio?: string;
  seed?: number;
  prompt?: string;
  negativePrompt?: string;
  source?: string;
  shotId?: string;
}

export type ShotImageUiStatus =
  | "EMPTY"
  | "GENERATING"
  | "CANDIDATE"
  | "READY"
  | "STALE";

export type VideoGenerationMode = "TEXT_TO_VIDEO" | "IMAGE_TO_VIDEO";

export const VIDEO_ASPECT_RATIOS = IMAGE_ASPECT_RATIOS;
export type VideoAspectRatio = ImageAspectRatio;

export interface VideoGenerationInput {
  shotId: string;
  prompt?: string;
  negativePrompt?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  aspectRatio?: VideoAspectRatio;
  fps?: number;
  seed?: number;
}

export interface ImageToVideoGenerationInput extends VideoGenerationInput {
  sourceAssetId?: string;
}

export interface VideoGenerationResult {
  url?: string;
  base64?: string;
  mimeType: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  provider?: string;
  model?: string;
  providerRequestId?: string;
  metadata?: Record<string, unknown>;
}

export interface VideoGenerationPreview {
  taskId: string;
  status: string;
  provider: string | null;
  model: string | null;
  capability: string | null;
  durationSeconds?: number;
  width?: number;
  height?: number;
  previewUrl?: string;
  sourceImage?: { id: string; url: string | null } | null;
  usage?: GenerationTaskUsage | null;
  error?: string | null;
}

export interface VideoGenerationUsage {
  durationMs?: number;
  sourceShotId?: string;
  sourceAssetId?: string;
  outputAssetCount?: number;
}

export type ShotVideoUiStatus =
  | "EMPTY"
  | "GENERATING"
  | "CANDIDATE"
  | "READY"
  | "STALE";

export const TTS_MAX_TEXT_LENGTH = 4000;
export const TTS_AUDIO_FORMATS = ["mp3", "wav", "ogg", "aac", "opus"] as const;
export type TtsAudioFormat = (typeof TTS_AUDIO_FORMATS)[number];

export interface TtsGenerationOptions {
  voiceId?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  format?: TtsAudioFormat;
}

export interface TtsGenerationInput extends TtsGenerationOptions {
  episodeId: string;
  scriptBlockId: string;
  text?: string;
  characterId?: string;
}

export interface GeneratedAudio {
  url?: string;
  base64?: string;
  mimeType: string;
  format?: string;
  durationSeconds?: number;
  provider?: string;
  model?: string;
  voice?: string;
  providerRequestId?: string;
  metadata?: Record<string, unknown>;
}

export type TtsGenerationResult = GeneratedAudio;

export interface TtsGenerationPreview {
  taskId: string;
  status: string;
  provider: string | null;
  model: string | null;
  voice?: string;
  durationSeconds?: number;
  previewUrl?: string;
  mimeType?: string;
  usage?: GenerationTaskUsage | null;
  error?: string | null;
}

export const SFX_CATEGORIES = [
  "impact",
  "weapon",
  "magic",
  "explosion",
  "environment",
  "mechanical",
  "footstep",
  "door",
  "wind",
  "fire",
  "water",
  "creature",
  "technology",
  "ui",
  "other",
] as const;
export type SfxCategory = (typeof SFX_CATEGORIES)[number];

export interface MusicGenerationInput {
  episodeId: string;
  prompt: string;
  durationSeconds?: number;
  style?: string;
  mood?: string;
  genre?: string;
  instrumentation?: string;
  tempo?: string;
  language?: string;
  isInstrumental?: boolean;
  title?: string;
  negativePrompt?: string;
  loopable?: boolean;
  intensity?: string;
}

export interface SfxGenerationInput {
  episodeId: string;
  prompt: string;
  durationSeconds?: number;
  category?: string;
  intensity?: string;
  negativePrompt?: string;
  sceneId?: string;
  shotId?: string;
}

export interface MusicMetadata {
  type: "music";
  style?: string;
  mood?: string;
  genre?: string;
  durationSeconds?: number;
  instrumentation?: string;
  tempo?: string;
  isInstrumental?: boolean;
}

export interface SfxMetadata {
  type: "sfx";
  category?: string;
  intensity?: string;
  sceneId?: string;
  shotId?: string;
  source?: string;
}

export type MusicGenerationResult = GeneratedAudio;
export type SfxGenerationResult = GeneratedAudio;

export interface MusicContext {
  projectName?: string;
  genre?: string;
  worldSummary?: string;
  storyBiblePremise?: string;
  storyBibleTone?: string;
  seasonTitle?: string;
  episodeTitle?: string;
  episodeOutline?: string;
  episodeSynopsis?: string;
  continuityNotes?: string;
  storyStateSummary?: string;
  scriptSummary?: string;
  storyboardSummary?: string;
}

export interface SfxContext extends MusicContext {
  sceneTitle?: string;
  shotVisualDescription?: string;
  shotAction?: string;
  shotEnvironment?: string;
}

export enum TimelineStatus {
  DRAFT = "DRAFT",
  PREVIEW_READY = "PREVIEW_READY",
  STALE = "STALE",
  LOCKED = "LOCKED",
}

export enum TimelineTrackType {
  VIDEO = "VIDEO",
  IMAGE = "IMAGE",
  DIALOGUE = "DIALOGUE",
  MUSIC = "MUSIC",
  SFX = "SFX",
}

export enum TimelineClipType {
  VIDEO = "VIDEO",
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
}

export enum TimelineClipSourceType {
  STORYBOARD_SHOT = "STORYBOARD_SHOT",
  SCRIPT_BLOCK = "SCRIPT_BLOCK",
  EPISODE_AUDIO = "EPISODE_AUDIO",
  ASSET = "ASSET",
}

export const TIMELINE_STATUS_LABELS: Record<TimelineStatus, string> = {
  [TimelineStatus.DRAFT]: "草稿",
  [TimelineStatus.PREVIEW_READY]: "可预览",
  [TimelineStatus.STALE]: "已过期",
  [TimelineStatus.LOCKED]: "已锁定",
};

export interface EpisodeTimeline {
  id: string;
  projectId: string;
  episodeId: string;
  version: number;
  status: TimelineStatus;
  computedStatus?: TimelineStatus;
  stale?: boolean;
  durationSeconds: number;
  fps: number;
  resolution: string;
  aspectRatio: string;
  sourceStoryboardVersion: number | null;
  sourceScriptVersion: number | null;
  sourceAssetVersionSummary: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  tracks?: TimelineTrack[];
}

export interface TimelineTrack {
  id: string;
  timelineId: string;
  type: TimelineTrackType;
  name: string;
  order: number;
  enabled: boolean;
  muted: boolean;
  volume: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  clips?: TimelineClip[];
}

export interface TimelineClip {
  id: string;
  trackId: string;
  type: TimelineClipType;
  sourceType: TimelineClipSourceType;
  sourceId: string;
  assetId: string;
  startTime: number;
  duration: number;
  sourceStartTime: number;
  sourceDuration: number;
  zIndex: number;
  volume: number;
  speed: number;
  opacity: number;
  enabled: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineMissingAssets {
  visual: Array<{ shotId: string; shotNumber?: number }>;
  dialogue: Array<{ blockId: string }>;
  music: boolean;
  sfx: boolean;
}

export interface TimelineBuildInput {
  rebuild?: boolean;
}

export interface TimelineBuildResult {
  timeline: EpisodeTimeline;
  created: boolean;
  rebuilt: boolean;
  missing: TimelineMissingAssets;
}

export interface TimelineContinuityResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface UpdateEpisodeTimelineInput {
  fps?: number;
  resolution?: string;
  aspectRatio?: string;
  status?: TimelineStatus;
  metadata?: Record<string, unknown> | null;
}

export interface CreateTimelineTrackInput {
  type: TimelineTrackType;
  name: string;
  order?: number;
  enabled?: boolean;
  muted?: boolean;
  volume?: number;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateTimelineTrackInput {
  name?: string;
  order?: number;
  enabled?: boolean;
  muted?: boolean;
  volume?: number;
  metadata?: Record<string, unknown> | null;
}

export interface CreateTimelineClipInput {
  trackId: string;
  type: TimelineClipType;
  sourceType: TimelineClipSourceType;
  sourceId: string;
  assetId: string;
  startTime: number;
  duration: number;
  sourceStartTime?: number;
  sourceDuration?: number;
  zIndex?: number;
  volume?: number;
  speed?: number;
  opacity?: number;
  enabled?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateTimelineClipInput {
  startTime?: number;
  duration?: number;
  sourceStartTime?: number;
  sourceDuration?: number;
  zIndex?: number;
  volume?: number;
  speed?: number;
  opacity?: number;
  enabled?: boolean;
}

export interface CompositionAssetRef {
  id: string;
  type: AssetType;
  name: string;
  url: string | null;
  mimeType: string | null;
  durationSeconds: number | null;
}

export interface CompositionClip {
  id: string;
  type: TimelineClipType;
  sourceType: TimelineClipSourceType;
  sourceId: string;
  assetId: string;
  startTime: number;
  duration: number;
  sourceStartTime: number;
  sourceDuration: number;
  zIndex: number;
  volume: number;
  speed: number;
  opacity: number;
  enabled: boolean;
  playbackVolume: number;
  asset: CompositionAssetRef | null;
}

export interface CompositionTrack {
  id: string;
  type: TimelineTrackType;
  name: string;
  order: number;
  enabled: boolean;
  muted: boolean;
  volume: number;
  clips: CompositionClip[];
}

export interface CompositionManifest {
  episodeId: string;
  projectId: string;
  timelineId: string;
  version: number;
  status: TimelineStatus;
  durationSeconds: number;
  fps: number;
  resolution: string;
  aspectRatio: string;
  tracks: CompositionTrack[];
}

export interface CompositionPreview {
  disclaimer: string;
  ready: boolean;
  readyMessage: string;
  missing: TimelineMissingAssets;
  stale: boolean;
  manifest: CompositionManifest;
}
