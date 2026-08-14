import { API_DEFAULT_BASE_URL } from "@ai-drama-studio/config";
import type {
  Civilization,
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
} from "@ai-drama-studio/types";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
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
      const message =
        (body && typeof body === "object" && "message" in body
          ? String((body as { message: unknown }).message)
          : null) || `Request failed: ${response.status}`;
      throw new ApiError(message, response.status, body);
    }

    return body as T;
  }
}

export function createApiClient(baseUrl = API_DEFAULT_BASE_URL): ApiClient {
  return new ApiClient(baseUrl.replace(/\/$/, ""));
}
