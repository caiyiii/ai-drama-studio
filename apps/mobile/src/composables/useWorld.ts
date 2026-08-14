import { ref } from "vue";
import { ApiError } from "@ai-drama-studio/api-client";
import type {
  Civilization,
  CreateWorldInput,
  Faction,
  PowerSystem,
  UpdateWorldInput,
  World,
  WorldHistory,
  WorldLocation,
} from "@ai-drama-studio/types";
import { api } from "../api";

const world = ref<World | null>(null);
const civilizations = ref<Civilization[]>([]);
const history = ref<WorldHistory[]>([]);
const factions = ref<Faction[]>([]);
const locations = ref<WorldLocation[]>([]);
const powerSystems = ref<PowerSystem[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const missing = ref(false);

export function useWorld() {
  async function load(projectId: string) {
    loading.value = true;
    error.value = null;
    missing.value = false;
    try {
      world.value = await api.getWorld(projectId);
      const [civ, his, fac, loc, power] = await Promise.all([
        api.getCivilizations(projectId),
        api.getWorldHistory(projectId),
        api.getFactions(projectId),
        api.getWorldLocations(projectId),
        api.getPowerSystems(projectId),
      ]);
      civilizations.value = civ;
      history.value = his;
      factions.value = fac;
      locations.value = loc;
      powerSystems.value = power;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        world.value = null;
        missing.value = true;
        return;
      }
      error.value = err instanceof Error ? err.message : "加载失败";
    } finally {
      loading.value = false;
    }
  }

  async function createWorld(projectId: string, data: CreateWorldInput) {
    saving.value = true;
    error.value = null;
    try {
      world.value = await api.createWorld(projectId, data);
      missing.value = false;
      return world.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "创建失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateWorld(projectId: string, data: UpdateWorldInput) {
    saving.value = true;
    error.value = null;
    try {
      world.value = await api.updateWorld(projectId, data);
      return world.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "保存失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  return {
    world,
    civilizations,
    history,
    factions,
    locations,
    powerSystems,
    loading,
    saving,
    error,
    missing,
    load,
    createWorld,
    updateWorld,
    api,
  };
}
