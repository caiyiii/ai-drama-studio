import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
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
    return this.request<GenerationTask>(
      `/projects/${projectId}/generations/${id}/apply`,
      { method: "POST" },
    );
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
    return this.applyWorldGeneration(projectId, id);
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
