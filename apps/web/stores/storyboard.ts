import { ApiError } from "@ai-drama-studio/api-client";
import {
  GenerationTaskType,
  StoryboardStatus,
  type GenerationTask,
  type Storyboard,
  type StoryboardGenerationInput,
  type StoryboardInput,
  type StoryboardShotInput,
  type UpdateStoryboardInput,
  type UpdateStoryboardShotInput,
  type ImageGenerationInput,
  type VideoGenerationInput,
  type ImageToVideoGenerationInput,
  type StoryboardShotAsset,
} from "@ai-drama-studio/types";

export const useStoryboardStore = defineStore("storyboard", () => {
  const { $api } = useNuxtApp();
  const storyboard = ref<Storyboard | null>(null);
  const selectedShotId = ref<string | null>(null);
  const selectedSceneId = ref<string | null>(null);
  const generations = ref<GenerationTask[]>([]);
  const missing = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const generating = ref(false);
  const imageGeneratingShotId = ref<string | null>(null);
  const videoGeneratingShotId = ref<string | null>(null);
  const previewByShotId = ref<Record<string, GenerationTask>>({});
  const videoPreviewByShotId = ref<Record<string, GenerationTask>>({});
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);

  const shots = computed(() => storyboard.value?.shots ?? []);
  const sceneIds = computed(() =>
    [...new Set(shots.value.map((item) => item.sceneId).filter(Boolean))] as string[],
  );
  const visibleShots = computed(() =>
    selectedSceneId.value
      ? shots.value.filter((item) => item.sceneId === selectedSceneId.value)
      : shots.value,
  );
  const selectedShot = computed(
    () =>
      shots.value.find((item) => item.id === selectedShotId.value) ??
      visibleShots.value[0] ??
      null,
  );
  const storyboardGenerations = computed(() =>
    generations.value.filter((item) => item.type === GenerationTaskType.STORYBOARD),
  );
  const imageGenerations = computed(() =>
    generations.value.filter((item) => item.type === GenerationTaskType.IMAGE),
  );
  const videoGenerations = computed(() =>
    generations.value.filter(
      (item) =>
        item.type === GenerationTaskType.VIDEO ||
        item.type === GenerationTaskType.IMAGE_TO_VIDEO,
    ),
  );
  const locked = computed(() => storyboard.value?.status === StoryboardStatus.LOCKED);
  const totalDuration = computed(
    () =>
      storyboard.value?.totalDurationSeconds ??
      shots.value.reduce((sum, item) => sum + item.durationSeconds, 0),
  );

  async function load(projectId: string, episodeId: string) {
    loading.value = true;
    error.value = null;
    missing.value = false;
    try {
      const [current, tasks] = await Promise.all([
        $api.getEpisodeStoryboard(projectId, episodeId),
        $api.getProjectGenerations(projectId).catch(() => [] as GenerationTask[]),
      ]);
      const keepShotId = selectedShotId.value;
      const keepSceneId = selectedSceneId.value;
      storyboard.value = current;
      generations.value = tasks.filter(
        (item) =>
          item.type === GenerationTaskType.STORYBOARD ||
          item.type === GenerationTaskType.IMAGE ||
          item.type === GenerationTaskType.VIDEO ||
          item.type === GenerationTaskType.IMAGE_TO_VIDEO,
      );
      const shotIds = new Set((current.shots ?? []).map((item) => item.id));
      selectedSceneId.value =
        keepSceneId && (current.shots ?? []).some((item) => item.sceneId === keepSceneId)
          ? keepSceneId
          : current.shots?.[0]?.sceneId ?? null;
      selectedShotId.value =
        keepShotId && shotIds.has(keepShotId)
          ? keepShotId
          : current.shots?.[0]?.id ?? null;
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 404 || err.code === "STORYBOARD_NOT_FOUND")
      ) {
        storyboard.value = null;
        missing.value = true;
        selectedShotId.value = null;
        try {
          const tasks = await $api.getProjectGenerations(projectId);
          generations.value = tasks.filter(
            (item) =>
              item.type === GenerationTaskType.STORYBOARD ||
              item.type === GenerationTaskType.IMAGE ||
              item.type === GenerationTaskType.VIDEO ||
              item.type === GenerationTaskType.IMAGE_TO_VIDEO,
          );
        } catch {
          generations.value = [];
        }
      } else {
        error.value = err instanceof Error ? err.message : "加载分镜失败";
      }
    } finally {
      loading.value = false;
    }
  }

  async function create(projectId: string, episodeId: string, data: StoryboardInput) {
    saving.value = true;
    actionError.value = null;
    try {
      storyboard.value = await $api.createStoryboard(projectId, episodeId, data);
      missing.value = false;
      return storyboard.value;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "创建分镜失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function update(projectId: string, episodeId: string, data: UpdateStoryboardInput) {
    saving.value = true;
    actionError.value = null;
    try {
      storyboard.value = await $api.updateStoryboard(projectId, episodeId, data);
      return storyboard.value;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "保存分镜失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function createShot(projectId: string, episodeId: string, data: StoryboardShotInput) {
    actionError.value = null;
    try {
      const shot = await $api.createStoryboardShot(projectId, episodeId, data);
      await load(projectId, episodeId);
      selectedShotId.value = shot.id;
      return shot;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "新增镜头失败";
      return null;
    }
  }

  async function updateShot(
    projectId: string,
    episodeId: string,
    shotId: string,
    data: UpdateStoryboardShotInput,
  ) {
    try {
      const shot = await $api.updateStoryboardShot(projectId, episodeId, shotId, data);
      await load(projectId, episodeId);
      selectedShotId.value = shotId;
      return shot;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "保存镜头失败";
      return null;
    }
  }

  async function removeShot(projectId: string, episodeId: string, shotId: string) {
    try {
      await $api.deleteStoryboardShot(projectId, episodeId, shotId);
      await load(projectId, episodeId);
      return true;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "删除镜头失败";
      return false;
    }
  }

  async function reorder(projectId: string, episodeId: string, ids: string[]) {
    try {
      const rows = await $api.reorderStoryboardShots(projectId, episodeId, { ids });
      if (storyboard.value) {
        storyboard.value = { ...storyboard.value, shots: rows };
      }
      return rows;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "排序失败";
      return null;
    }
  }

  async function createStoryboardGeneration(
    projectId: string,
    data: StoryboardGenerationInput,
  ) {
    generating.value = true;
    actionError.value = null;
    try {
      const task = await $api.createStoryboardGeneration(projectId, data);
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

  async function createImageGeneration(projectId: string, data: ImageGenerationInput) {
    imageGeneratingShotId.value = data.shotId;
    actionError.value = null;
    try {
      const task = await $api.createImageGeneration(projectId, data);
      generations.value = [task, ...generations.value.filter((item) => item.id !== task.id)];
      previewByShotId.value = { ...previewByShotId.value, [data.shotId]: task };
      return task;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "图片生成失败";
      return null;
    } finally {
      imageGeneratingShotId.value = null;
    }
  }

  async function applyImageGeneration(projectId: string, episodeId: string, id: string) {
    const task = await applyGeneration(projectId, id);
    if (task) {
      await load(projectId, episodeId);
    }
    return task;
  }

  async function setPrimaryShotAsset(
    projectId: string,
    episodeId: string,
    shotId: string,
    assetId: string,
  ): Promise<StoryboardShotAsset[] | null> {
    actionError.value = null;
    try {
      const rows = await $api.setPrimaryShotAsset(projectId, episodeId, shotId, assetId);
      await load(projectId, episodeId);
      return rows;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "设置最终资源失败";
      return null;
    }
  }

  async function createVideoGeneration(projectId: string, data: VideoGenerationInput) {
    videoGeneratingShotId.value = data.shotId;
    actionError.value = null;
    try {
      const task = await $api.createVideoGeneration(projectId, data);
      generations.value = [task, ...generations.value.filter((item) => item.id !== task.id)];
      videoPreviewByShotId.value = { ...videoPreviewByShotId.value, [data.shotId]: task };
      return task;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "视频生成失败";
      return null;
    } finally {
      videoGeneratingShotId.value = null;
    }
  }

  async function createImageToVideoGeneration(
    projectId: string,
    data: ImageToVideoGenerationInput,
  ) {
    videoGeneratingShotId.value = data.shotId;
    actionError.value = null;
    try {
      const task = await $api.createImageToVideoGeneration(projectId, data);
      generations.value = [task, ...generations.value.filter((item) => item.id !== task.id)];
      videoPreviewByShotId.value = { ...videoPreviewByShotId.value, [data.shotId]: task };
      return task;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "图生视频失败";
      return null;
    } finally {
      videoGeneratingShotId.value = null;
    }
  }

  async function applyVideoGeneration(projectId: string, episodeId: string, id: string) {
    const task = await applyGeneration(projectId, id);
    if (task) {
      await load(projectId, episodeId);
    }
    return task;
  }

  async function setPrimaryVideoAsset(
    projectId: string,
    episodeId: string,
    shotId: string,
    assetId: string,
  ) {
    return setPrimaryShotAsset(projectId, episodeId, shotId, assetId);
  }

  return {
    storyboard,
    shots,
    sceneIds,
    visibleShots,
    selectedShotId,
    selectedSceneId,
    selectedShot,
    generations,
    storyboardGenerations,
    imageGenerations,
    videoGenerations,
    imageGeneratingShotId,
    videoGeneratingShotId,
    previewByShotId,
    videoPreviewByShotId,
    missing,
    locked,
    loading,
    saving,
    generating,
    error,
    actionError,
    totalDuration,
    load,
    create,
    update,
    createShot,
    updateShot,
    removeShot,
    reorder,
    createStoryboardGeneration,
    applyGeneration,
    createImageGeneration,
    applyImageGeneration,
    setPrimaryShotAsset,
    createVideoGeneration,
    createImageToVideoGeneration,
    applyVideoGeneration,
    setPrimaryVideoAsset,
  };
});
