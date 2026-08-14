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
  SCRIPT = "SCRIPT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  VOICE = "VOICE",
  STORYBOARD = "STORYBOARD",
}

export enum GenerationTaskStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

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
