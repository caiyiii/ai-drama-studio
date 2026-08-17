import { ref } from "vue";
import { ApiError } from "@ai-drama-studio/api-client";
import type { Episode, Season, StoryBible, UpdateEpisodeInput, UpdateSeasonInput, UpdateStoryBibleInput } from "@ai-drama-studio/types";
import { api } from "../api";

export function useStory() {
  const bible = ref<StoryBible | null>(null);
  const seasons = ref<Season[]>([]);
  const season = ref<Season | null>(null);
  const episodes = ref<Episode[]>([]);
  const episode = ref<Episode | null>(null);
  const missingBible = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  async function loadBible(projectId: string) {
    loading.value = true;
    error.value = null;
    missingBible.value = false;
    try {
      bible.value = await api.getStoryBible(projectId);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.code === "STORY_BIBLE_NOT_FOUND")) {
        bible.value = null;
        missingBible.value = true;
      } else {
        error.value = err instanceof Error ? err.message : "加载故事圣经失败";
      }
    } finally {
      loading.value = false;
    }
  }

  async function saveBible(projectId: string, data: UpdateStoryBibleInput & { title: string }) {
    saving.value = true;
    error.value = null;
    try {
      bible.value = missingBible.value
        ? await api.createStoryBible(projectId, data)
        : await api.updateStoryBible(projectId, data);
      missingBible.value = false;
      return bible.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "保存失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function loadSeasons(projectId: string) {
    loading.value = true;
    error.value = null;
    try {
      seasons.value = await api.getSeasons(projectId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载季失败";
    } finally {
      loading.value = false;
    }
  }

  async function createSeason(projectId: string, number: number, title: string) {
    saving.value = true;
    error.value = null;
    try {
      const created = await api.createSeason(projectId, { number, title });
      seasons.value = [...seasons.value, created].sort((a, b) => a.number - b.number);
      return created;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "创建失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function loadSeason(projectId: string, seasonId: string) {
    loading.value = true;
    error.value = null;
    try {
      const [current, list] = await Promise.all([
        api.getSeason(projectId, seasonId),
        api.getEpisodes(projectId, seasonId),
      ]);
      season.value = current;
      episodes.value = list;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载季失败";
    } finally {
      loading.value = false;
    }
  }

  async function saveSeason(projectId: string, seasonId: string, data: UpdateSeasonInput) {
    saving.value = true;
    error.value = null;
    try {
      season.value = await api.updateSeason(projectId, seasonId, data);
      return season.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "保存失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function createEpisode(projectId: string, seasonId: string, number: number, title: string) {
    saving.value = true;
    error.value = null;
    try {
      const created = await api.createEpisode(projectId, seasonId, { number, title });
      episodes.value = [...episodes.value, created].sort((a, b) => a.number - b.number);
      return created;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "创建失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function loadEpisode(projectId: string, seasonId: string, episodeId: string) {
    loading.value = true;
    error.value = null;
    try {
      episode.value = await api.getEpisode(projectId, seasonId, episodeId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载剧集失败";
    } finally {
      loading.value = false;
    }
  }

  async function saveEpisode(
    projectId: string,
    seasonId: string,
    episodeId: string,
    data: UpdateEpisodeInput,
  ) {
    saving.value = true;
    error.value = null;
    try {
      episode.value = await api.updateEpisode(projectId, seasonId, episodeId, data);
      return episode.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "保存失败";
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
    missingBible,
    loading,
    saving,
    error,
    loadBible,
    saveBible,
    loadSeasons,
    createSeason,
    loadSeason,
    saveSeason,
    createEpisode,
    loadEpisode,
    saveEpisode,
  };
}
