import { ref } from "vue";
import { ApiError } from "@ai-drama-studio/api-client";
import type { Storyboard, StoryboardShot, UpdateStoryboardShotInput } from "@ai-drama-studio/types";
import { api } from "../api";

export function useStoryboard() {
  const storyboard = ref<Storyboard | null>(null);
  const missing = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  async function loadStoryboard(projectId: string, episodeId: string) {
    loading.value = true;
    error.value = null;
    missing.value = false;
    try {
      storyboard.value = await api.getEpisodeStoryboard(projectId, episodeId);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 404 || err.code === "STORYBOARD_NOT_FOUND")
      ) {
        storyboard.value = null;
        missing.value = true;
      } else {
        error.value = err instanceof Error ? err.message : "加载分镜失败";
      }
    } finally {
      loading.value = false;
    }
  }

  async function saveShot(
    projectId: string,
    episodeId: string,
    shotId: string,
    data: UpdateStoryboardShotInput,
  ) {
    saving.value = true;
    error.value = null;
    try {
      const shot = await api.updateStoryboardShot(projectId, episodeId, shotId, data);
      await loadStoryboard(projectId, episodeId);
      return shot;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "保存镜头失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  return { storyboard, missing, loading, saving, error, loadStoryboard, saveShot };
}

export type { StoryboardShot };
