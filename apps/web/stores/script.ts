import { ApiError } from "@ai-drama-studio/api-client";
import {
  GenerationTaskType,
  ScriptStatus,
  type GenerationTask,
  type SceneInput,
  type Script,
  type ScriptBlockInput,
  type ScriptGenerationInput,
  type ScriptInput,
  type UpdateSceneInput,
  type UpdateScriptBlockInput,
  type UpdateScriptInput,
} from "@ai-drama-studio/types";

export const useScriptStore = defineStore("script", () => {
  const { $api } = useNuxtApp();
  const script = ref<Script | null>(null);
  const selectedSceneId = ref<string | null>(null);
  const generations = ref<GenerationTask[]>([]);
  const missing = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const generating = ref(false);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);

  const scenes = computed(() => script.value?.scenes ?? []);
  const selectedScene = computed(
    () => scenes.value.find((item) => item.id === selectedSceneId.value) ?? scenes.value[0] ?? null,
  );
  const scriptGenerations = computed(() =>
    generations.value.filter((item) => item.type === GenerationTaskType.SCRIPT),
  );
  const locked = computed(() => script.value?.status === ScriptStatus.LOCKED);

  async function load(projectId: string, episodeId: string) {
    loading.value = true;
    error.value = null;
    missing.value = false;
    try {
      const [current, tasks] = await Promise.all([
        $api.getScript(projectId, episodeId),
        $api.getProjectGenerations(projectId).catch(() => [] as GenerationTask[]),
      ]);
      script.value = current;
      generations.value = tasks;
      selectedSceneId.value = current.scenes?.[0]?.id ?? null;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.code === "SCRIPT_NOT_FOUND")) {
        script.value = null;
        missing.value = true;
        selectedSceneId.value = null;
        try {
          generations.value = await $api.getProjectGenerations(projectId);
        } catch {
          generations.value = [];
        }
      } else {
        error.value = err instanceof Error ? err.message : "加载剧本失败";
      }
    } finally {
      loading.value = false;
    }
  }

  async function create(projectId: string, episodeId: string, data: ScriptInput) {
    saving.value = true;
    actionError.value = null;
    try {
      script.value = await $api.createScript(projectId, episodeId, data);
      missing.value = false;
      selectedSceneId.value = script.value.scenes?.[0]?.id ?? null;
      return script.value;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "创建剧本失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function update(projectId: string, episodeId: string, data: UpdateScriptInput) {
    saving.value = true;
    actionError.value = null;
    try {
      script.value = await $api.updateScript(projectId, episodeId, data);
      return script.value;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "保存失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function createScene(projectId: string, episodeId: string, data: SceneInput) {
    saving.value = true;
    actionError.value = null;
    try {
      const scene = await $api.createScene(projectId, episodeId, data);
      await load(projectId, episodeId);
      selectedSceneId.value = scene.id;
      return scene;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "新增场景失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateScene(
    projectId: string,
    episodeId: string,
    sceneId: string,
    data: UpdateSceneInput,
  ) {
    saving.value = true;
    actionError.value = null;
    try {
      const scene = await $api.updateScene(projectId, episodeId, sceneId, data);
      await load(projectId, episodeId);
      selectedSceneId.value = scene.id;
      return scene;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "保存场景失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function removeScene(projectId: string, episodeId: string, sceneId: string) {
    saving.value = true;
    actionError.value = null;
    try {
      await $api.deleteScene(projectId, episodeId, sceneId);
      await load(projectId, episodeId);
      return true;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "删除场景失败";
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function reorderScenes(projectId: string, episodeId: string, ids: string[]) {
    try {
      const list = await $api.reorderScenes(projectId, episodeId, { ids });
      if (script.value) {
        script.value = { ...script.value, scenes: list };
      }
      return list;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "场景排序失败";
      return null;
    }
  }

  async function createBlock(
    projectId: string,
    episodeId: string,
    sceneId: string,
    data: ScriptBlockInput,
  ) {
    saving.value = true;
    actionError.value = null;
    try {
      const block = await $api.createScriptBlock(projectId, episodeId, sceneId, data);
      await load(projectId, episodeId);
      selectedSceneId.value = sceneId;
      return block;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "新增段落失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateBlock(
    projectId: string,
    episodeId: string,
    sceneId: string,
    blockId: string,
    data: UpdateScriptBlockInput,
  ) {
    try {
      const block = await $api.updateScriptBlock(projectId, episodeId, sceneId, blockId, data);
      await load(projectId, episodeId);
      selectedSceneId.value = sceneId;
      return block;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "保存段落失败";
      return null;
    }
  }

  async function removeBlock(
    projectId: string,
    episodeId: string,
    sceneId: string,
    blockId: string,
  ) {
    try {
      await $api.deleteScriptBlock(projectId, episodeId, sceneId, blockId);
      await load(projectId, episodeId);
      selectedSceneId.value = sceneId;
      return true;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "删除段落失败";
      return false;
    }
  }

  async function createScriptGeneration(projectId: string, data: ScriptGenerationInput) {
    generating.value = true;
    actionError.value = null;
    try {
      const task = await $api.createScriptGeneration(projectId, data);
      generations.value = [task, ...generations.value.filter((item) => item.id !== task.id)];
      return task;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "AI 生成失败";
      return null;
    } finally {
      generating.value = false;
    }
  }

  async function applyGeneration(projectId: string, id: string) {
    saving.value = true;
    actionError.value = null;
    try {
      const task = await $api.applyGeneration(projectId, id);
      generations.value = generations.value.map((item) => (item.id === task.id ? task : item));
      return task;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "应用失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  return {
    script,
    scenes,
    selectedSceneId,
    selectedScene,
    generations,
    scriptGenerations,
    missing,
    locked,
    loading,
    saving,
    generating,
    error,
    actionError,
    load,
    create,
    update,
    createScene,
    updateScene,
    removeScene,
    reorderScenes,
    createBlock,
    updateBlock,
    removeBlock,
    createScriptGeneration,
    applyGeneration,
  };
});
