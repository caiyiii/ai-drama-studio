import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import { AssetType } from "@ai-drama-studio/types";
import type {
  AIProvider,
  AIProviderTestInput,
  AIProviderTestResult,
  AiCapability,
  AiCapabilityDefinition,
  Character,
  CharacterInput,
  CharacterListQuery,
  CharacterListResult,
  CharacterRelationship,
  CharacterRelationshipInput,
  CharacterRelationshipUpdateInput,
  CharacterUpdateInput,
  CharacterGenerationInput,
  Civilization,
  CreateAIProviderInput,
  CreateCivilizationInput,
  CreateFactionInput,
  CreatePowerSystemInput,
  CreateProjectInput,
  CreateWorldHistoryInput,
  CreateWorldInput,
  CreateWorldLocationInput,
  Faction,
  HealthResponse,
  PowerSystem,
  Project,
  ProjectAIProvider,
  ProjectAiConfigMap,
  SetProjectAiConfigInput,
  UpdateAIProviderInput,
  UpdateCivilizationInput,
  UpdateFactionInput,
  UpdatePowerSystemInput,
  UpdateProjectInput,
  UpdateWorldHistoryInput,
  UpdateWorldInput,
  UpdateWorldLocationInput,
  World,
  WorldHistory,
  WorldLocation,
  WorldGenerationInput,
  GenerationTask,
  Episode,
  EpisodeGenerationInput,
  EpisodeInput,
  ReorderEpisodesInput,
  Season,
  SeasonGenerationInput,
  SeasonInput,
  StoryBible,
  StoryBibleGenerationInput,
  StoryBibleInput,
  UpdateEpisodeInput,
  UpdateSeasonInput,
  UpdateStoryBibleInput,
  ReorderScenesInput,
  ReorderScriptBlocksInput,
  Scene,
  SceneInput,
  Script,
  ScriptBlock,
  ScriptBlockInput,
  ScriptGenerationInput,
  ScriptInput,
  Storyboard,
  StoryboardGenerationInput,
  StoryboardInput,
  StoryboardShot,
  StoryboardShotInput,
  StoryboardShotAsset,
  ScriptBlockAsset,
  ReorderStoryboardShotsInput,
  ImageGenerationInput,
  VideoGenerationInput,
  ImageToVideoGenerationInput,
  TtsGenerationInput,
  Asset,
  UpdateSceneInput,
  UpdateScriptBlockInput,
  UpdateScriptInput,
  UpdateStoryboardInput,
  UpdateStoryboardShotInput,
} from "@ai-drama-studio/types";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly code?: string;

  constructor(message: string, status: number, body: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health");
  }

  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>("/projects");
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    return this.request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deleteProject(id: string): Promise<void> {
    await this.request<void>(`/projects/${id}`, { method: "DELETE" });
  }

  async getWorld(projectId: string): Promise<World> {
    return this.request<World>(`/projects/${projectId}/world`);
  }

  async createWorld(projectId: string, data: CreateWorldInput): Promise<World> {
    return this.request<World>(`/projects/${projectId}/world`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateWorld(projectId: string, data: UpdateWorldInput): Promise<World> {
    return this.request<World>(`/projects/${projectId}/world`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteWorld(projectId: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/world`, { method: "DELETE" });
  }

  async getCivilizations(projectId: string): Promise<Civilization[]> {
    return this.request<Civilization[]>(
      `/projects/${projectId}/world/civilizations`,
    );
  }

  async createCivilization(
    projectId: string,
    data: CreateCivilizationInput,
  ): Promise<Civilization> {
    return this.request<Civilization>(
      `/projects/${projectId}/world/civilizations`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateCivilization(
    projectId: string,
    id: string,
    data: UpdateCivilizationInput,
  ): Promise<Civilization> {
    return this.request<Civilization>(
      `/projects/${projectId}/world/civilizations/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deleteCivilization(projectId: string, id: string): Promise<void> {
    await this.request<void>(
      `/projects/${projectId}/world/civilizations/${id}`,
      { method: "DELETE" },
    );
  }

  async getWorldHistory(projectId: string): Promise<WorldHistory[]> {
    return this.request<WorldHistory[]>(`/projects/${projectId}/world/history`);
  }

  async createWorldHistory(
    projectId: string,
    data: CreateWorldHistoryInput,
  ): Promise<WorldHistory> {
    return this.request<WorldHistory>(`/projects/${projectId}/world/history`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateWorldHistory(
    projectId: string,
    id: string,
    data: UpdateWorldHistoryInput,
  ): Promise<WorldHistory> {
    return this.request<WorldHistory>(
      `/projects/${projectId}/world/history/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deleteWorldHistory(projectId: string, id: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/world/history/${id}`, {
      method: "DELETE",
    });
  }

  async getFactions(projectId: string): Promise<Faction[]> {
    return this.request<Faction[]>(`/projects/${projectId}/world/factions`);
  }

  async createFaction(
    projectId: string,
    data: CreateFactionInput,
  ): Promise<Faction> {
    return this.request<Faction>(`/projects/${projectId}/world/factions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateFaction(
    projectId: string,
    id: string,
    data: UpdateFactionInput,
  ): Promise<Faction> {
    return this.request<Faction>(
      `/projects/${projectId}/world/factions/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deleteFaction(projectId: string, id: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/world/factions/${id}`, {
      method: "DELETE",
    });
  }

  async getWorldLocations(projectId: string): Promise<WorldLocation[]> {
    return this.request<WorldLocation[]>(
      `/projects/${projectId}/world/locations`,
    );
  }

  async createWorldLocation(
    projectId: string,
    data: CreateWorldLocationInput,
  ): Promise<WorldLocation> {
    return this.request<WorldLocation>(
      `/projects/${projectId}/world/locations`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateWorldLocation(
    projectId: string,
    id: string,
    data: UpdateWorldLocationInput,
  ): Promise<WorldLocation> {
    return this.request<WorldLocation>(
      `/projects/${projectId}/world/locations/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deleteWorldLocation(projectId: string, id: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/world/locations/${id}`, {
      method: "DELETE",
    });
  }

  async getPowerSystems(projectId: string): Promise<PowerSystem[]> {
    return this.request<PowerSystem[]>(
      `/projects/${projectId}/world/power-systems`,
    );
  }

  async createPowerSystem(
    projectId: string,
    data: CreatePowerSystemInput,
  ): Promise<PowerSystem> {
    return this.request<PowerSystem>(
      `/projects/${projectId}/world/power-systems`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updatePowerSystem(
    projectId: string,
    id: string,
    data: UpdatePowerSystemInput,
  ): Promise<PowerSystem> {
    return this.request<PowerSystem>(
      `/projects/${projectId}/world/power-systems/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deletePowerSystem(projectId: string, id: string): Promise<void> {
    await this.request<void>(
      `/projects/${projectId}/world/power-systems/${id}`,
      { method: "DELETE" },
    );
  }

  async createWorldGeneration(
    projectId: string,
    data: WorldGenerationInput,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/world`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async getProjectGenerations(projectId: string): Promise<GenerationTask[]> {
    return this.request<GenerationTask[]>(
      `/projects/${projectId}/generations`,
    );
  }

  async getGeneration(projectId: string, id: string): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/${id}`,
    );
  }

  async applyWorldGeneration(
    projectId: string,
    id: string,
  ): Promise<GenerationTask> {
    return this.applyGeneration(projectId, id);
  }

  async createCharacterGeneration(
    projectId: string,
    data: CharacterGenerationInput,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/character`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async getCharacterGeneration(
    projectId: string,
    id: string,
  ): Promise<GenerationTask> {
    return this.getGeneration(projectId, id);
  }

  async applyCharacterGeneration(
    projectId: string,
    id: string,
  ): Promise<GenerationTask> {
    return this.applyGeneration(projectId, id);
  }

  async getStoryBible(projectId: string): Promise<StoryBible> {
    return this.request<StoryBible>(`/projects/${projectId}/story-bible`);
  }

  async createStoryBible(
    projectId: string,
    data: StoryBibleInput,
  ): Promise<StoryBible> {
    return this.request<StoryBible>(`/projects/${projectId}/story-bible`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateStoryBible(
    projectId: string,
    data: UpdateStoryBibleInput,
  ): Promise<StoryBible> {
    return this.request<StoryBible>(`/projects/${projectId}/story-bible`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteStoryBible(projectId: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/story-bible`, {
      method: "DELETE",
    });
  }

  async getSeasons(projectId: string): Promise<Season[]> {
    return this.request<Season[]>(`/projects/${projectId}/seasons`);
  }

  async getSeason(projectId: string, seasonId: string): Promise<Season> {
    return this.request<Season>(`/projects/${projectId}/seasons/${seasonId}`);
  }

  async createSeason(projectId: string, data: SeasonInput): Promise<Season> {
    return this.request<Season>(`/projects/${projectId}/seasons`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSeason(
    projectId: string,
    seasonId: string,
    data: UpdateSeasonInput,
  ): Promise<Season> {
    return this.request<Season>(`/projects/${projectId}/seasons/${seasonId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteSeason(projectId: string, seasonId: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/seasons/${seasonId}`, {
      method: "DELETE",
    });
  }

  async getEpisodes(projectId: string, seasonId: string): Promise<Episode[]> {
    return this.request<Episode[]>(
      `/projects/${projectId}/seasons/${seasonId}/episodes`,
    );
  }

  async getProjectEpisodes(projectId: string): Promise<Episode[]> {
    return this.request<Episode[]>(`/projects/${projectId}/episodes`);
  }

  async getEpisode(
    projectId: string,
    seasonId: string,
    episodeId: string,
  ): Promise<Episode> {
    return this.request<Episode>(
      `/projects/${projectId}/seasons/${seasonId}/episodes/${episodeId}`,
    );
  }

  async createEpisode(
    projectId: string,
    seasonId: string,
    data: EpisodeInput,
  ): Promise<Episode> {
    return this.request<Episode>(
      `/projects/${projectId}/seasons/${seasonId}/episodes`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateEpisode(
    projectId: string,
    seasonId: string,
    episodeId: string,
    data: UpdateEpisodeInput,
  ): Promise<Episode> {
    return this.request<Episode>(
      `/projects/${projectId}/seasons/${seasonId}/episodes/${episodeId}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deleteEpisode(
    projectId: string,
    seasonId: string,
    episodeId: string,
  ): Promise<void> {
    await this.request<void>(
      `/projects/${projectId}/seasons/${seasonId}/episodes/${episodeId}`,
      { method: "DELETE" },
    );
  }

  async reorderEpisodes(
    projectId: string,
    seasonId: string,
    data: ReorderEpisodesInput,
  ): Promise<Episode[]> {
    return this.request<Episode[]>(
      `/projects/${projectId}/seasons/${seasonId}/episodes/reorder`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async createStoryBibleGeneration(
    projectId: string,
    data: StoryBibleGenerationInput,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/story-bible`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async createSeasonOutlineGeneration(
    projectId: string,
    data: SeasonGenerationInput,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/season-outline`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async createEpisodeOutlineGeneration(
    projectId: string,
    data: EpisodeGenerationInput,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/episode`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async createScriptGeneration(
    projectId: string,
    data: ScriptGenerationInput,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/script`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async getScript(projectId: string, episodeId: string): Promise<Script> {
    return this.request<Script>(
      `/projects/${projectId}/episodes/${episodeId}/script`,
    );
  }

  async createScript(
    projectId: string,
    episodeId: string,
    data: ScriptInput,
  ): Promise<Script> {
    return this.request<Script>(
      `/projects/${projectId}/episodes/${episodeId}/script`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateScript(
    projectId: string,
    episodeId: string,
    data: UpdateScriptInput,
  ): Promise<Script> {
    return this.request<Script>(
      `/projects/${projectId}/episodes/${episodeId}/script`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deleteScript(projectId: string, episodeId: string): Promise<void> {
    await this.request<void>(
      `/projects/${projectId}/episodes/${episodeId}/script`,
      { method: "DELETE" },
    );
  }

  async getScenes(projectId: string, episodeId: string): Promise<Scene[]> {
    return this.request<Scene[]>(
      `/projects/${projectId}/episodes/${episodeId}/script/scenes`,
    );
  }

  async createScene(
    projectId: string,
    episodeId: string,
    data: SceneInput,
  ): Promise<Scene> {
    return this.request<Scene>(
      `/projects/${projectId}/episodes/${episodeId}/script/scenes`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateScene(
    projectId: string,
    episodeId: string,
    sceneId: string,
    data: UpdateSceneInput,
  ): Promise<Scene> {
    return this.request<Scene>(
      `/projects/${projectId}/episodes/${episodeId}/script/scenes/${sceneId}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deleteScene(
    projectId: string,
    episodeId: string,
    sceneId: string,
  ): Promise<void> {
    await this.request<void>(
      `/projects/${projectId}/episodes/${episodeId}/script/scenes/${sceneId}`,
      { method: "DELETE" },
    );
  }

  async reorderScenes(
    projectId: string,
    episodeId: string,
    data: ReorderScenesInput,
  ): Promise<Scene[]> {
    return this.request<Scene[]>(
      `/projects/${projectId}/episodes/${episodeId}/script/scenes/reorder`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async getScriptBlocks(
    projectId: string,
    episodeId: string,
    sceneId: string,
  ): Promise<ScriptBlock[]> {
    return this.request<ScriptBlock[]>(
      `/projects/${projectId}/episodes/${episodeId}/script/scenes/${sceneId}/blocks`,
    );
  }

  async createScriptBlock(
    projectId: string,
    episodeId: string,
    sceneId: string,
    data: ScriptBlockInput,
  ): Promise<ScriptBlock> {
    return this.request<ScriptBlock>(
      `/projects/${projectId}/episodes/${episodeId}/script/scenes/${sceneId}/blocks`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateScriptBlock(
    projectId: string,
    episodeId: string,
    sceneId: string,
    blockId: string,
    data: UpdateScriptBlockInput,
  ): Promise<ScriptBlock> {
    return this.request<ScriptBlock>(
      `/projects/${projectId}/episodes/${episodeId}/script/scenes/${sceneId}/blocks/${blockId}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deleteScriptBlock(
    projectId: string,
    episodeId: string,
    sceneId: string,
    blockId: string,
  ): Promise<void> {
    await this.request<void>(
      `/projects/${projectId}/episodes/${episodeId}/script/scenes/${sceneId}/blocks/${blockId}`,
      { method: "DELETE" },
    );
  }

  async reorderScriptBlocks(
    projectId: string,
    episodeId: string,
    sceneId: string,
    data: ReorderScriptBlocksInput,
  ): Promise<ScriptBlock[]> {
    return this.request<ScriptBlock[]>(
      `/projects/${projectId}/episodes/${episodeId}/script/scenes/${sceneId}/blocks/reorder`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async applyGeneration(
    projectId: string,
    id: string,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/${id}/apply`,
      { method: "POST" },
    );
  }

  async createStoryboardGeneration(
    projectId: string,
    data: StoryboardGenerationInput,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/storyboard`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async createImageGeneration(
    projectId: string,
    data: ImageGenerationInput,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/image`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async createVideoGeneration(
    projectId: string,
    data: VideoGenerationInput,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/video`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async createImageToVideoGeneration(
    projectId: string,
    data: ImageToVideoGenerationInput,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/image-to-video`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async getVideoGeneration(projectId: string, id: string): Promise<GenerationTask> {
    return this.getGeneration(projectId, id);
  }

  async applyVideoGeneration(projectId: string, id: string): Promise<GenerationTask> {
    return this.applyGeneration(projectId, id);
  }

  async createTtsGeneration(
    projectId: string,
    data: TtsGenerationInput,
  ): Promise<GenerationTask> {
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/tts`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async getTtsGeneration(projectId: string, id: string): Promise<GenerationTask> {
    return this.getGeneration(projectId, id);
  }

  async applyTtsGeneration(projectId: string, id: string): Promise<GenerationTask> {
    return this.applyGeneration(projectId, id);
  }

  async getAudioAssets(projectId: string): Promise<Asset[]> {
    return this.listAssets(projectId, AssetType.AUDIO);
  }

  async getScriptBlockAssets(
    projectId: string,
    scriptBlockId: string,
  ): Promise<ScriptBlockAsset[]> {
    return this.request<ScriptBlockAsset[]>(
      `/projects/${projectId}/script-blocks/${scriptBlockId}/assets`,
    );
  }

  async setPrimaryScriptBlockAsset(
    projectId: string,
    scriptBlockId: string,
    assetId: string,
  ): Promise<ScriptBlockAsset[]> {
    return this.request<ScriptBlockAsset[]>(
      `/projects/${projectId}/script-blocks/${scriptBlockId}/assets/${assetId}/primary`,
      { method: "POST" },
    );
  }

  async getVideoAssets(projectId: string): Promise<Asset[]> {
    return this.listAssets(projectId, AssetType.VIDEO);
  }

  async getImageGeneration(projectId: string, id: string): Promise<GenerationTask> {
    return this.getGeneration(projectId, id);
  }

  async applyImageGeneration(projectId: string, id: string): Promise<GenerationTask> {
    return this.applyGeneration(projectId, id);
  }

  async listAssets(projectId: string, type?: AssetType): Promise<Asset[]> {
    const query = type ? `?type=${encodeURIComponent(type)}` : "";
    return this.request<Asset[]>(`/projects/${projectId}/assets${query}`);
  }

  async getAsset(projectId: string, assetId: string): Promise<Asset> {
    return this.request<Asset>(`/projects/${projectId}/assets/${assetId}`);
  }

  async getShotAssets(
    projectId: string,
    episodeId: string,
    shotId: string,
    type?: AssetType,
  ): Promise<StoryboardShotAsset[]> {
    const query = type ? `?type=${encodeURIComponent(type)}` : "";
    return this.request<StoryboardShotAsset[]>(
      `/projects/${projectId}/episodes/${episodeId}/storyboard/shots/${shotId}/assets${query}`,
    );
  }

  async getShotVideoAssets(
    projectId: string,
    episodeId: string,
    shotId: string,
  ): Promise<StoryboardShotAsset[]> {
    return this.getShotAssets(projectId, episodeId, shotId, AssetType.VIDEO);
  }

  async setPrimaryShotAsset(
    projectId: string,
    episodeId: string,
    shotId: string,
    assetId: string,
  ): Promise<StoryboardShotAsset[]> {
    return this.request<StoryboardShotAsset[]>(
      `/projects/${projectId}/episodes/${episodeId}/storyboard/shots/${shotId}/assets/${assetId}/primary`,
      { method: "POST" },
    );
  }

  async setPrimaryVideoAsset(
    projectId: string,
    episodeId: string,
    shotId: string,
    assetId: string,
  ): Promise<StoryboardShotAsset[]> {
    return this.setPrimaryShotAsset(projectId, episodeId, shotId, assetId);
  }

  async getEpisodeStoryboard(
    projectId: string,
    episodeId: string,
  ): Promise<Storyboard> {
    return this.request<Storyboard>(
      `/projects/${projectId}/episodes/${episodeId}/storyboard`,
    );
  }

  async createStoryboard(
    projectId: string,
    episodeId: string,
    data: StoryboardInput,
  ): Promise<Storyboard> {
    return this.request<Storyboard>(
      `/projects/${projectId}/episodes/${episodeId}/storyboard`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateStoryboard(
    projectId: string,
    episodeId: string,
    data: UpdateStoryboardInput,
  ): Promise<Storyboard> {
    return this.request<Storyboard>(
      `/projects/${projectId}/episodes/${episodeId}/storyboard`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deleteStoryboard(projectId: string, episodeId: string): Promise<void> {
    await this.request<void>(
      `/projects/${projectId}/episodes/${episodeId}/storyboard`,
      { method: "DELETE" },
    );
  }

  async getStoryboardShots(
    projectId: string,
    episodeId: string,
    page = 1,
    pageSize = 100,
  ): Promise<StoryboardShot[]> {
    return this.request<StoryboardShot[]>(
      `/projects/${projectId}/episodes/${episodeId}/storyboard/shots?page=${page}&pageSize=${pageSize}`,
    );
  }

  async createStoryboardShot(
    projectId: string,
    episodeId: string,
    data: StoryboardShotInput,
  ): Promise<StoryboardShot> {
    return this.request<StoryboardShot>(
      `/projects/${projectId}/episodes/${episodeId}/storyboard/shots`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateStoryboardShot(
    projectId: string,
    episodeId: string,
    shotId: string,
    data: UpdateStoryboardShotInput,
  ): Promise<StoryboardShot> {
    return this.request<StoryboardShot>(
      `/projects/${projectId}/episodes/${episodeId}/storyboard/shots/${shotId}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deleteStoryboardShot(
    projectId: string,
    episodeId: string,
    shotId: string,
  ): Promise<void> {
    await this.request<void>(
      `/projects/${projectId}/episodes/${episodeId}/storyboard/shots/${shotId}`,
      { method: "DELETE" },
    );
  }

  async reorderStoryboardShots(
    projectId: string,
    episodeId: string,
    data: ReorderStoryboardShotsInput,
  ): Promise<StoryboardShot[]> {
    return this.request<StoryboardShot[]>(
      `/projects/${projectId}/episodes/${episodeId}/storyboard/shots/reorder`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async getAIProviders(): Promise<AIProvider[]> {
    return this.request<AIProvider[]>("/ai/providers");
  }

  async getAIProvider(id: string): Promise<AIProvider> {
    return this.request<AIProvider>(`/ai/providers/${id}`);
  }

  async createAIProvider(data: CreateAIProviderInput): Promise<AIProvider> {
    return this.request<AIProvider>("/ai/providers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAIProvider(
    id: string,
    data: UpdateAIProviderInput,
  ): Promise<AIProvider> {
    return this.request<AIProvider>(`/ai/providers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteAIProvider(id: string): Promise<void> {
    await this.request<void>(`/ai/providers/${id}`, { method: "DELETE" });
  }

  async testAIProvider(id: string): Promise<AIProviderTestResult> {
    return this.request<AIProviderTestResult>(`/ai/providers/${id}/test`, {
      method: "POST",
    });
  }

  async testAIProviderConfig(
    data: AIProviderTestInput,
  ): Promise<AIProviderTestResult> {
    return this.request<AIProviderTestResult>("/ai/providers/test", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getProjectAIProvider(projectId: string): Promise<ProjectAIProvider> {
    return this.request<ProjectAIProvider>(
      `/projects/${projectId}/ai-provider`,
    );
  }

  async setProjectAIProvider(
    projectId: string,
    aiProviderId: string | null,
  ): Promise<ProjectAIProvider> {
    return this.request<ProjectAIProvider>(
      `/projects/${projectId}/ai-provider`,
      {
        method: "PATCH",
        body: JSON.stringify({ aiProviderId }),
      },
    );
  }

  async getAiCapabilities(): Promise<AiCapabilityDefinition[]> {
    return this.request<AiCapabilityDefinition[]>("/ai/capabilities");
  }

  async getProjectAiConfig(projectId: string): Promise<ProjectAiConfigMap> {
    return this.request<ProjectAiConfigMap>(`/projects/${projectId}/ai-config`);
  }

  async setProjectAiConfig(
    projectId: string,
    capability: AiCapability,
    input: SetProjectAiConfigInput,
  ): Promise<ProjectAiConfigMap> {
    return this.request<ProjectAiConfigMap>(
      `/projects/${projectId}/ai-config/${capability}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
  }

  async deleteProjectAiConfig(
    projectId: string,
    capability: AiCapability,
  ): Promise<ProjectAiConfigMap> {
    return this.request<ProjectAiConfigMap>(
      `/projects/${projectId}/ai-config/${capability}`,
      { method: "DELETE" },
    );
  }

  async getCharacters(
    projectId: string,
    query: CharacterListQuery = {},
  ): Promise<Character[]> {
    const result = await this.listCharacters(projectId, query);
    return result.items;
  }

  async listCharacters(
    projectId: string,
    query: CharacterListQuery = {},
  ): Promise<CharacterListResult> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.pageSize) params.set("pageSize", String(query.pageSize));
    if (query.search) params.set("search", query.search);
    if (query.role) params.set("role", query.role);
    if (query.civilizationId) params.set("civilizationId", query.civilizationId);
    if (query.factionId) params.set("factionId", query.factionId);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return this.request<CharacterListResult>(
      `/projects/${projectId}/characters${suffix}`,
    );
  }

  async getCharacter(projectId: string, characterId: string): Promise<Character> {
    return this.request<Character>(
      `/projects/${projectId}/characters/${characterId}`,
    );
  }

  async createCharacter(
    projectId: string,
    input: CharacterInput,
  ): Promise<Character> {
    return this.request<Character>(`/projects/${projectId}/characters`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateCharacter(
    projectId: string,
    characterId: string,
    input: CharacterUpdateInput,
  ): Promise<Character> {
    return this.request<Character>(
      `/projects/${projectId}/characters/${characterId}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  }

  async deleteCharacter(projectId: string, characterId: string): Promise<void> {
    await this.request<void>(
      `/projects/${projectId}/characters/${characterId}`,
      { method: "DELETE" },
    );
  }

  async getCharacterRelationships(
    projectId: string,
  ): Promise<CharacterRelationship[]> {
    return this.request<CharacterRelationship[]>(
      `/projects/${projectId}/character-relationships`,
    );
  }

  async getCharacterRelationship(
    projectId: string,
    relationshipId: string,
  ): Promise<CharacterRelationship> {
    return this.request<CharacterRelationship>(
      `/projects/${projectId}/character-relationships/${relationshipId}`,
    );
  }

  async createCharacterRelationship(
    projectId: string,
    input: CharacterRelationshipInput,
  ): Promise<CharacterRelationship> {
    return this.request<CharacterRelationship>(
      `/projects/${projectId}/character-relationships`,
      { method: "POST", body: JSON.stringify(input) },
    );
  }

  async updateCharacterRelationship(
    projectId: string,
    relationshipId: string,
    input: CharacterRelationshipUpdateInput,
  ): Promise<CharacterRelationship> {
    return this.request<CharacterRelationship>(
      `/projects/${projectId}/character-relationships/${relationshipId}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  }

  async deleteCharacterRelationship(
    projectId: string,
    relationshipId: string,
  ): Promise<void> {
    await this.request<void>(
      `/projects/${projectId}/character-relationships/${relationshipId}`,
      { method: "DELETE" },
    );
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
      },
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message = extractErrorMessage(body) || `Request failed: ${response.status}`;
      const code = extractErrorCode(body);
      throw new ApiError(message, response.status, body, code);
    }

    return body as T;
  }
}

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("message" in body)) {
    return null;
  }
  const message = (body as { message: unknown }).message;
  if (typeof message === "string") {
    return message;
  }
  if (Array.isArray(message)) {
    return message.map(String).join("；");
  }
  return null;
}

function extractErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("code" in body)) {
    return undefined;
  }
  const code = (body as { code: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export function createApiClient(baseUrl = API_DEFAULT_BASE_URL): ApiClient {
  return new ApiClient(baseUrl.replace(/\/$/, ""));
}
