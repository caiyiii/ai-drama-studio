import { ApiError } from "@ai-drama-studio/api-client";
import type {
  Civilization,
  CreateCivilizationInput,
  CreateFactionInput,
  CreatePowerSystemInput,
  CreateWorldHistoryInput,
  CreateWorldInput,
  CreateWorldLocationInput,
  Faction,
  PowerSystem,
  UpdateCivilizationInput,
  UpdateFactionInput,
  UpdatePowerSystemInput,
  UpdateWorldHistoryInput,
  UpdateWorldInput,
  UpdateWorldLocationInput,
  World,
  WorldHistory,
  WorldLocation,
} from "@ai-drama-studio/types";

export const useWorldStore = defineStore("world", () => {
  const { $api } = useNuxtApp();
  const world = ref<World | null>(null);
  const civilizations = ref<Civilization[]>([]);
  const history = ref<WorldHistory[]>([]);
  const factions = ref<Faction[]>([]);
  const locations = ref<WorldLocation[]>([]);
  const powerSystems = ref<PowerSystem[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);
  const missing = ref(false);

  function reset() {
    world.value = null;
    civilizations.value = [];
    history.value = [];
    factions.value = [];
    locations.value = [];
    powerSystems.value = [];
    missing.value = false;
    error.value = null;
    actionError.value = null;
  }

  async function runMutation<T>(fn: () => Promise<T>, fallback: string): Promise<T | null> {
    saving.value = true;
    actionError.value = null;
    try {
      return await fn();
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : fallback;
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function load(projectId: string) {
    loading.value = true;
    error.value = null;
    missing.value = false;
    try {
      world.value = await $api.getWorld(projectId);
      await Promise.all([
        loadCivilizations(projectId),
        loadHistory(projectId),
        loadFactions(projectId),
        loadLocations(projectId),
        loadPowerSystems(projectId),
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        reset();
        missing.value = true;
        return;
      }
      error.value = err instanceof Error ? err.message : "加载世界观失败";
    } finally {
      loading.value = false;
    }
  }

  async function createWorld(projectId: string, data: CreateWorldInput) {
    const created = await runMutation(
      () => $api.createWorld(projectId, data),
      "创建世界观失败",
    );
    if (created) {
      world.value = created;
      missing.value = false;
    }
    return created;
  }

  async function updateWorld(projectId: string, data: UpdateWorldInput) {
    const updated = await runMutation(
      () => $api.updateWorld(projectId, data),
      "保存失败",
    );
    if (updated) {
      world.value = updated;
    }
    return updated;
  }

  async function loadCivilizations(projectId: string) {
    civilizations.value = await $api.getCivilizations(projectId);
  }

  async function createCivilization(
    projectId: string,
    data: CreateCivilizationInput,
  ) {
    const item = await runMutation(
      () => $api.createCivilization(projectId, data),
      "创建文明失败",
    );
    if (item) {
      civilizations.value = [...civilizations.value, item];
    }
    return item;
  }

  async function updateCivilization(
    projectId: string,
    id: string,
    data: UpdateCivilizationInput,
  ) {
    const item = await runMutation(
      () => $api.updateCivilization(projectId, id, data),
      "更新文明失败",
    );
    if (item) {
      civilizations.value = civilizations.value.map((entry) =>
        entry.id === id ? item : entry,
      );
    }
    return item;
  }

  async function deleteCivilization(projectId: string, id: string) {
    const ok = await runMutation(async () => {
      await $api.deleteCivilization(projectId, id);
      return true;
    }, "删除文明失败");
    if (!ok) {
      return;
    }
    civilizations.value = civilizations.value.filter((entry) => entry.id !== id);
    factions.value = factions.value.map((entry) =>
      entry.civilizationId === id ? { ...entry, civilizationId: null } : entry,
    );
    locations.value = locations.value.map((entry) =>
      entry.civilizationId === id ? { ...entry, civilizationId: null } : entry,
    );
  }

  async function loadHistory(projectId: string) {
    history.value = await $api.getWorldHistory(projectId);
  }

  async function createHistory(projectId: string, data: CreateWorldHistoryInput) {
    const item = await runMutation(
      () => $api.createWorldHistory(projectId, data),
      "创建历史事件失败",
    );
    if (item) {
      history.value = [...history.value, item].sort((a, b) => a.order - b.order);
    }
    return item;
  }

  async function updateHistory(
    projectId: string,
    id: string,
    data: UpdateWorldHistoryInput,
  ) {
    const item = await runMutation(
      () => $api.updateWorldHistory(projectId, id, data),
      "更新历史事件失败",
    );
    if (item) {
      history.value = history.value
        .map((entry) => (entry.id === id ? item : entry))
        .sort((a, b) => a.order - b.order);
    }
    return item;
  }

  async function deleteHistory(projectId: string, id: string) {
    const ok = await runMutation(async () => {
      await $api.deleteWorldHistory(projectId, id);
      return true;
    }, "删除历史事件失败");
    if (ok) {
      history.value = history.value.filter((entry) => entry.id !== id);
    }
  }

  async function moveHistory(projectId: string, id: string, direction: "up" | "down") {
    const list = [...history.value].sort((a, b) => a.order - b.order);
    const index = list.findIndex((entry) => entry.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= list.length) {
      return;
    }
    const current = list[index];
    const neighbor = list[swapWith];
    const ok = await runMutation(async () => {
      await Promise.all([
        $api.updateWorldHistory(projectId, current.id, { order: neighbor.order }),
        $api.updateWorldHistory(projectId, neighbor.id, { order: current.order }),
      ]);
      return true;
    }, "调整顺序失败");
    if (ok) {
      await loadHistory(projectId);
    }
  }

  async function loadFactions(projectId: string) {
    factions.value = await $api.getFactions(projectId);
  }

  async function createFaction(projectId: string, data: CreateFactionInput) {
    const item = await runMutation(
      () => $api.createFaction(projectId, data),
      "创建势力失败",
    );
    if (item) {
      factions.value = [...factions.value, item];
    }
    return item;
  }

  async function updateFaction(
    projectId: string,
    id: string,
    data: UpdateFactionInput,
  ) {
    const item = await runMutation(
      () => $api.updateFaction(projectId, id, data),
      "更新势力失败",
    );
    if (item) {
      factions.value = factions.value.map((entry) => (entry.id === id ? item : entry));
    }
    return item;
  }

  async function deleteFaction(projectId: string, id: string) {
    const ok = await runMutation(async () => {
      await $api.deleteFaction(projectId, id);
      return true;
    }, "删除势力失败");
    if (ok) {
      factions.value = factions.value.filter((entry) => entry.id !== id);
    }
  }

  async function loadLocations(projectId: string) {
    locations.value = await $api.getWorldLocations(projectId);
  }

  async function createLocation(projectId: string, data: CreateWorldLocationInput) {
    const item = await runMutation(
      () => $api.createWorldLocation(projectId, data),
      "创建地点失败",
    );
    if (item) {
      locations.value = [...locations.value, item];
    }
    return item;
  }

  async function updateLocation(
    projectId: string,
    id: string,
    data: UpdateWorldLocationInput,
  ) {
    const item = await runMutation(
      () => $api.updateWorldLocation(projectId, id, data),
      "更新地点失败",
    );
    if (item) {
      locations.value = locations.value.map((entry) => (entry.id === id ? item : entry));
    }
    return item;
  }

  async function deleteLocation(projectId: string, id: string) {
    const ok = await runMutation(async () => {
      await $api.deleteWorldLocation(projectId, id);
      return true;
    }, "删除地点失败");
    if (ok) {
      locations.value = locations.value.filter((entry) => entry.id !== id);
    }
  }

  async function loadPowerSystems(projectId: string) {
    powerSystems.value = await $api.getPowerSystems(projectId);
  }

  async function createPowerSystem(projectId: string, data: CreatePowerSystemInput) {
    const item = await runMutation(
      () => $api.createPowerSystem(projectId, data),
      "创建能力体系失败",
    );
    if (item) {
      powerSystems.value = [...powerSystems.value, item];
    }
    return item;
  }

  async function updatePowerSystem(
    projectId: string,
    id: string,
    data: UpdatePowerSystemInput,
  ) {
    const item = await runMutation(
      () => $api.updatePowerSystem(projectId, id, data),
      "更新能力体系失败",
    );
    if (item) {
      powerSystems.value = powerSystems.value.map((entry) =>
        entry.id === id ? item : entry,
      );
    }
    return item;
  }

  async function deletePowerSystem(projectId: string, id: string) {
    const ok = await runMutation(async () => {
      await $api.deletePowerSystem(projectId, id);
      return true;
    }, "删除能力体系失败");
    if (ok) {
      powerSystems.value = powerSystems.value.filter((entry) => entry.id !== id);
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
    actionError,
    missing,
    load,
    createWorld,
    updateWorld,
    createCivilization,
    updateCivilization,
    deleteCivilization,
    createHistory,
    updateHistory,
    deleteHistory,
    moveHistory,
    createFaction,
    updateFaction,
    deleteFaction,
    createLocation,
    updateLocation,
    deleteLocation,
    createPowerSystem,
    updatePowerSystem,
    deletePowerSystem,
  };
});
