import { defineStore } from "pinia";
import type { CreateLocationInput, Location, UpdateLocationInput } from "@ai-drama-studio/types";
import { ref } from "vue";

export const useLocationStore = defineStore("location", () => {
  const { $api } = useNuxtApp();
  const locations = ref<Location[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);

  async function load(projectId: string) {
    loading.value = true;
    error.value = null;
    try {
      locations.value = await $api.getLocations(projectId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载场景失败";
    } finally {
      loading.value = false;
    }
  }

  async function create(projectId: string, data: CreateLocationInput) {
    saving.value = true;
    actionError.value = null;
    try {
      const created = await $api.createLocation(projectId, data);
      locations.value = [...locations.value, created].sort((a, b) => a.name.localeCompare(b.name));
      return created;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "创建场景失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function update(projectId: string, id: string, data: UpdateLocationInput) {
    saving.value = true;
    actionError.value = null;
    try {
      const updated = await $api.updateLocation(projectId, id, data);
      locations.value = locations.value
        .map((item) => (item.id === id ? updated : item))
        .sort((a, b) => a.name.localeCompare(b.name));
      return updated;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "更新场景失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function remove(projectId: string, id: string) {
    saving.value = true;
    actionError.value = null;
    try {
      await $api.deleteLocation(projectId, id);
      locations.value = locations.value.filter((item) => item.id !== id);
      return true;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "删除场景失败";
      return false;
    } finally {
      saving.value = false;
    }
  }

  return {
    locations,
    loading,
    saving,
    error,
    actionError,
    load,
    create,
    update,
    remove,
  };
});
