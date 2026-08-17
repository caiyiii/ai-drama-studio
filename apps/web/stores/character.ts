import { ApiError } from "@ai-drama-studio/api-client";
import {
  GenerationTaskType,
  type Character,
  type CharacterGenerationInput,
  type CharacterInput,
  type CharacterListQuery,
  type CharacterRelationship,
  type CharacterRelationshipInput,
  type CharacterRelationshipUpdateInput,
  type CharacterUpdateInput,
  type Civilization,
  type Faction,
  type GenerationTask,
} from "@ai-drama-studio/types";

export const useCharacterStore = defineStore("character", () => {
  const { $api } = useNuxtApp();
  const characters = ref<Character[]>([]);
  const relationships = ref<CharacterRelationship[]>([]);
  const civilizations = ref<Civilization[]>([]);
  const factions = ref<Faction[]>([]);
  const generations = ref<GenerationTask[]>([]);
  const hasWorld = ref(false);
  const loading = ref(false);
  const saving = ref(false);
  const generating = ref(false);
  const error = ref<string | null>(null);
  const actionError = ref<string | null>(null);

  const characterGenerations = computed(() =>
    generations.value.filter((item) => item.type === GenerationTaskType.CHARACTER),
  );

  async function load(projectId: string, query: CharacterListQuery = {}) {
    loading.value = true;
    error.value = null;
    actionError.value = null;
    hasWorld.value = false;
    try {
      const [list, rels, tasks] = await Promise.all([
        $api.listCharacters(projectId, { pageSize: 100, ...query }),
        $api.getCharacterRelationships(projectId),
        $api.getProjectGenerations(projectId),
      ]);
      characters.value = list.items;
      relationships.value = rels;
      generations.value = tasks;
      try {
        await $api.getWorld(projectId);
        hasWorld.value = true;
        const [civs, facs] = await Promise.all([
          $api.getCivilizations(projectId),
          $api.getFactions(projectId),
        ]);
        civilizations.value = civs;
        factions.value = facs;
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          hasWorld.value = false;
          civilizations.value = [];
          factions.value = [];
        } else {
          throw err;
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载人物失败";
    } finally {
      loading.value = false;
    }
  }

  async function getOne(projectId: string, characterId: string) {
    const cached = characters.value.find((item) => item.id === characterId);
    if (cached) {
      return cached;
    }
    return $api.getCharacter(projectId, characterId);
  }

  async function create(projectId: string, data: CharacterInput) {
    saving.value = true;
    actionError.value = null;
    try {
      const created = await $api.createCharacter(projectId, data);
      characters.value = [...characters.value, created];
      return created;
    } catch (err) {
      actionError.value = formatCharacterError(err, "创建人物失败");
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function update(
    projectId: string,
    characterId: string,
    data: CharacterUpdateInput,
  ) {
    saving.value = true;
    actionError.value = null;
    try {
      const updated = await $api.updateCharacter(projectId, characterId, data);
      characters.value = characters.value.map((item) =>
        item.id === updated.id ? updated : item,
      );
      return updated;
    } catch (err) {
      actionError.value = formatCharacterError(err, "更新人物失败");
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function remove(projectId: string, characterId: string) {
    saving.value = true;
    actionError.value = null;
    try {
      await $api.deleteCharacter(projectId, characterId);
      characters.value = characters.value.filter((item) => item.id !== characterId);
      relationships.value = relationships.value.filter(
        (item) =>
          item.fromCharacterId !== characterId &&
          item.toCharacterId !== characterId,
      );
      return true;
    } catch (err) {
      actionError.value = formatCharacterError(err, "删除人物失败");
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function createRelationship(
    projectId: string,
    data: CharacterRelationshipInput,
  ) {
    saving.value = true;
    actionError.value = null;
    try {
      const created = await $api.createCharacterRelationship(projectId, data);
      relationships.value = [...relationships.value, created];
      return created;
    } catch (err) {
      actionError.value = formatCharacterError(err, "创建人物关系失败");
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function updateRelationship(
    projectId: string,
    relationshipId: string,
    data: CharacterRelationshipUpdateInput,
  ) {
    saving.value = true;
    actionError.value = null;
    try {
      const updated = await $api.updateCharacterRelationship(
        projectId,
        relationshipId,
        data,
      );
      relationships.value = relationships.value.map((item) =>
        item.id === updated.id ? updated : item,
      );
      return updated;
    } catch (err) {
      actionError.value = formatCharacterError(err, "更新人物关系失败");
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function removeRelationship(projectId: string, relationshipId: string) {
    saving.value = true;
    actionError.value = null;
    try {
      await $api.deleteCharacterRelationship(projectId, relationshipId);
      relationships.value = relationships.value.filter(
        (item) => item.id !== relationshipId,
      );
      return true;
    } catch (err) {
      actionError.value = formatCharacterError(err, "删除人物关系失败");
      return false;
    } finally {
      saving.value = false;
    }
  }

  async function createCharacterGeneration(
    projectId: string,
    data: CharacterGenerationInput,
  ) {
    generating.value = true;
    actionError.value = null;
    try {
      const task = await $api.createCharacterGeneration(projectId, data);
      generations.value = [
        task,
        ...generations.value.filter((entry) => entry.id !== task.id),
      ];
      return task;
    } catch (err) {
      actionError.value = formatCharacterError(err, "AI 生成失败");
      return null;
    } finally {
      generating.value = false;
    }
  }

  async function applyCharacterGeneration(projectId: string, id: string) {
    saving.value = true;
    actionError.value = null;
    try {
      const task = await $api.applyCharacterGeneration(projectId, id);
      generations.value = generations.value.map((item) =>
        item.id === task.id ? task : item,
      );
      await load(projectId);
      return task;
    } catch (err) {
      actionError.value = formatCharacterError(err, "应用人物失败");
      return null;
    } finally {
      saving.value = false;
    }
  }

  return {
    characters,
    relationships,
    civilizations,
    factions,
    generations,
    characterGenerations,
    hasWorld,
    loading,
    saving,
    generating,
    error,
    actionError,
    load,
    getOne,
    create,
    update,
    remove,
    createRelationship,
    updateRelationship,
    removeRelationship,
    createCharacterGeneration,
    applyCharacterGeneration,
  };
});

function formatCharacterError(err: unknown, fallback: string) {
  if (err instanceof ApiError && err.code === "CHARACTER_NAME_CONFLICT") {
    return err.message;
  }
  return err instanceof Error ? err.message : fallback;
}
