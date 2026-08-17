import { ref } from "vue";
import { ApiError } from "@ai-drama-studio/api-client";
import type { Script, ScriptBlock, UpdateScriptBlockInput, UpdateScriptInput } from "@ai-drama-studio/types";
import { api } from "../api";

export function useScript() {
  const script = ref<Script | null>(null);
  const missing = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  async function loadScript(projectId: string, episodeId: string) {
    loading.value = true;
    error.value = null;
    missing.value = false;
    try {
      script.value = await api.getScript(projectId, episodeId);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.code === "SCRIPT_NOT_FOUND")) {
        script.value = null;
        missing.value = true;
      } else {
        error.value = err instanceof Error ? err.message : "加载剧本失败";
      }
    } finally {
      loading.value = false;
    }
  }

  async function saveScript(projectId: string, episodeId: string, data: UpdateScriptInput) {
    saving.value = true;
    error.value = null;
    try {
      script.value = await api.updateScript(projectId, episodeId, data);
      return script.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "保存失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function saveBlock(
    projectId: string,
    episodeId: string,
    sceneId: string,
    blockId: string,
    data: UpdateScriptBlockInput,
  ) {
    saving.value = true;
    error.value = null;
    try {
      const block = await api.updateScriptBlock(projectId, episodeId, sceneId, blockId, data);
      await loadScript(projectId, episodeId);
      return block;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "保存段落失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  return { script, missing, loading, saving, error, loadScript, saveScript, saveBlock };
}

export type { ScriptBlock };
