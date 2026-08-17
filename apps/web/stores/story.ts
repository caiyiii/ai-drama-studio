import { ApiError } from "@ai-drama-studio/api-client";
import {
  GenerationTaskType,
  type Episode,
  type EpisodeGenerationInput,
  type EpisodeInput,
  type GenerationTask,
  type Season,
  type SeasonGenerationInput,
  type SeasonInput,
  type StoryBible,
  type StoryBibleGenerationInput,
  type StoryBibleInput,
  type UpdateEpisodeInput,
  type UpdateSeasonInput,
  type UpdateStoryBibleInput,
} from "@ai-drama-studio/types";

export const useStoryStore = defineStore("story", () => {
  const { $api } = useNuxtApp();
  const bible = ref<StoryBible | null>(null);
  const seasons = ref<Season[]>([]);
  const season = ref<Season | null>(null);
  const episodes = ref<Episode[]>([]);
  const episode = ref<Episode | null>(null);
  const projectEpisodes = ref<Episode[]>([]);
  const generations = ref<GenerationTask[]>([]);
  const missingBible = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const generating = ref(false);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);

  const storyBibleGenerations = computed(() =>
    generations.value.filter((item) => item.type === GenerationTaskType.STORY_BIBLE),
  );
  const seasonOutlineGenerations = computed(() =>
    generations.value.filter((item) => item.type === GenerationTaskType.SEASON_OUTLINE),
  );
  const episodeOutlineGenerations = computed(() =>
    generations.value.filter((item) => item.type === GenerationTaskType.EPISODE_OUTLINE),
  );

  async function loadGenerations(projectId: string) {
    generations.value = await $api.getProjectGenerations(projectId);
  }

  async function loadBible(projectId: string) {
    loading.value = true;
    error.value = null;
    missingBible.value = false;
    try {
      bible.value = await $api.getStoryBible(projectId);
      await loadGenerations(projectId);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.code === "STORY_BIBLE_NOT_FOUND")) {
        bible.value = null;
        missingBible.value = true;
        try {
          await loadGenerations(projectId);
        } catch {
          generations.value = [];
        }
      } else {
        error.value = err instanceof Error ? err.message : "加载故事圣经失败";
      }
    } finally {
      loading.value = false;
    }
  }

  async function loadSeasons(projectId: string) {
    loading.value = true;
    error.value = null;
    try {
      seasons.value = await $api.getSeasons(projectId);
      await loadGenerations(projectId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载季失败";
    } finally {
      loading.value = false;
    }
  }

  async function loadSeason(projectId: string, seasonId: string) {
    loading.value = true;
    error.value = null;
    try {
      const [current, list] = await Promise.all([
        $api.getSeason(projectId, seasonId),
        $api.getEpisodes(projectId, seasonId),
      ]);
      season.value = current;
      episodes.value = list;
      await loadGenerations(projectId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载季详情失败";
    } finally {
      loading.value = false;
    }
  }

  async function loadEpisode(projectId: string, seasonId: string, episodeId: string) {
    loading.value = true;
    error.value = null;
    try {
      const [current, parent] = await Promise.all([
        $api.getEpisode(projectId, seasonId, episodeId),
        $api.getSeason(projectId, seasonId),
      ]);
      episode.value = current;
      season.value = parent;
      await loadGenerations(projectId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载剧集失败";
    } finally {
      loading.value = false;
    }
  }

  async function loadProjectEpisodes(projectId: string) {
    loading.value = true;
    error.value = null;
    try {
      const [list, seasonList] = await Promise.all([
        $api.getProjectEpisodes(projectId),
        $api.getSeasons(projectId),
      ]);
      projectEpisodes.value = list;
      seasons.value = seasonList;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载剧集失败";
    } finally {
      loading.value = false;
    }
  }

  async function createBible(projectId: string, data: StoryBibleInput) {
    saving.value = true;
    actionError.value = null;
    try {
      bible.value = await $api.createStoryBible(projectId, data);
      missingBible.value = false;
      return bible.value;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "创建失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateBible(projectId: string, data: UpdateStoryBibleInput) {
    saving.value = true;
    actionError.value = null;
    try {
      bible.value = await $api.updateStoryBible(projectId, data);
      return bible.value;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "保存失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function createSeason(projectId: string, data: SeasonInput) {
    saving.value = true;
    actionError.value = null;
    try {
      const created = await $api.createSeason(projectId, data);
      seasons.value = [...seasons.value, created].sort((a, b) => a.number - b.number);
      return created;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "创建季失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateSeason(projectId: string, seasonId: string, data: UpdateSeasonInput) {
    saving.value = true;
    actionError.value = null;
    try {
      const updated = await $api.updateSeason(projectId, seasonId, data);
      season.value = updated;
      seasons.value = seasons.value.map((item) => (item.id === updated.id ? updated : item));
      return updated;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "保存季失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function removeSeason(projectId: string, seasonId: string) {
    saving.value = true;
    actionError.value = null;
    try {
      await $api.deleteSeason(projectId, seasonId);
      seasons.value = seasons.value.filter((item) => item.id !== seasonId);
      return true;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "删除季失败";
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function createEpisode(projectId: string, seasonId: string, data: EpisodeInput) {
    saving.value = true;
    actionError.value = null;
    try {
      const created = await $api.createEpisode(projectId, seasonId, data);
      episodes.value = [...episodes.value, created].sort((a, b) => a.number - b.number);
      return created;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "创建剧集失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateEpisode(
    projectId: string,
    seasonId: string,
    episodeId: string,
    data: UpdateEpisodeInput,
  ) {
    saving.value = true;
    actionError.value = null;
    try {
      const updated = await $api.updateEpisode(projectId, seasonId, episodeId, data);
      episode.value = updated;
      episodes.value = episodes.value.map((item) => (item.id === updated.id ? updated : item));
      return updated;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "保存剧集失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function removeEpisode(projectId: string, seasonId: string, episodeId: string) {
    saving.value = true;
    actionError.value = null;
    try {
      await $api.deleteEpisode(projectId, seasonId, episodeId);
      episodes.value = episodes.value.filter((item) => item.id !== episodeId);
      return true;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "删除剧集失败";
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function reorderEpisodes(projectId: string, seasonId: string, ids: string[]) {
    saving.value = true;
    actionError.value = null;
    try {
      episodes.value = await $api.reorderEpisodes(projectId, seasonId, { ids });
      return episodes.value;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "排序失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function createStoryBibleGeneration(projectId: string, data: StoryBibleGenerationInput) {
    generating.value = true;
    actionError.value = null;
    try {
      const task = await $api.createStoryBibleGeneration(projectId, data);
      generations.value = [task, ...generations.value.filter((item) => item.id !== task.id)];
      return task;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "AI 生成失败";
      return null;
    } finally {
      generating.value = false;
    }
  }

  async function createSeasonOutlineGeneration(projectId: string, data: SeasonGenerationInput) {
    generating.value = true;
    actionError.value = null;
    try {
      const task = await $api.createSeasonOutlineGeneration(projectId, data);
      generations.value = [task, ...generations.value.filter((item) => item.id !== task.id)];
      return task;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "AI 拆集失败";
      return null;
    } finally {
      generating.value = false;
    }
  }

  async function createEpisodeOutlineGeneration(projectId: string, data: EpisodeGenerationInput) {
    generating.value = true;
    actionError.value = null;
    try {
      const task = await $api.createEpisodeOutlineGeneration(projectId, data);
      generations.value = [task, ...generations.value.filter((item) => item.id !== task.id)];
      return task;
    } catch (err) {
      actionError.value = err instanceof Error ? err.message : "AI 生成大纲失败";
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
    bible,
    seasons,
    season,
    episodes,
    episode,
    projectEpisodes,
    generations,
    storyBibleGenerations,
    seasonOutlineGenerations,
    episodeOutlineGenerations,
    missingBible,
    loading,
    saving,
    generating,
    error,
    actionError,
    loadBible,
    loadSeasons,
    loadSeason,
    loadEpisode,
    loadProjectEpisodes,
    createBible,
    updateBible,
    createSeason,
    updateSeason,
    removeSeason,
    createEpisode,
    updateEpisode,
    removeEpisode,
    reorderEpisodes,
    createStoryBibleGeneration,
    createSeasonOutlineGeneration,
    createEpisodeOutlineGeneration,
    applyGeneration,
  };
});
