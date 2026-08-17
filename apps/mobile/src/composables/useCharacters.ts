import { ref } from "vue";
import { ApiError } from "@ai-drama-studio/api-client";
import type {
  Character,
  CharacterInput,
  CharacterRelationship,
  CharacterRelationshipInput,
  Civilization,
  Faction,
} from "@ai-drama-studio/types";
import { api } from "../api";

export function useCharacters() {
  const characters = ref<Character[]>([]);
  const relationships = ref<CharacterRelationship[]>([]);
  const civilizations = ref<Civilization[]>([]);
  const factions = ref<Faction[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  async function load(projectId: string) {
    loading.value = true;
    error.value = null;
    try {
      const [list, rels] = await Promise.all([
        api.getCharacters(projectId),
        api.getCharacterRelationships(projectId),
      ]);
      characters.value = list;
      relationships.value = rels;
      try {
        await api.getWorld(projectId);
        civilizations.value = await api.getCivilizations(projectId);
        factions.value = await api.getFactions(projectId);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) {
          throw err;
        }
        civilizations.value = [];
        factions.value = [];
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "加载人物失败";
    } finally {
      loading.value = false;
    }
  }

  async function create(projectId: string, data: CharacterInput) {
    saving.value = true;
    error.value = null;
    try {
      const created = await api.createCharacter(projectId, data);
      characters.value = [...characters.value, created];
      return created;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "创建失败";
      return null;
    } finally {
      saving.value = false;
    }
  }

  async function createRelationship(
    projectId: string,
    data: CharacterRelationshipInput,
  ) {
    saving.value = true;
    error.value = null;
    try {
      const created = await api.createCharacterRelationship(projectId, data);
      relationships.value = [...relationships.value, created];
      return created;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "创建关系失败";
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
    loading,
    saving,
    error,
    load,
    create,
    createRelationship,
  };
}
