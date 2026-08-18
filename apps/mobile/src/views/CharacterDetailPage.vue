<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/tabs/projects/${projectId}/characters`" text="返回" />
        </ion-buttons>
        <ion-title>{{ character?.name ?? "人物详情" }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="error" class="state">
        <p>{{ error }}</p>
        <ion-button fill="outline" size="small" @click="() => load(projectId)">重试</ion-button>
      </div>
      <p v-else-if="loading || !character" class="state">正在载入…</p>
      <div v-else>
        <p class="eyebrow">{{ character.role || "未定位" }}</p>
        <h1>{{ character.name }}</h1>
        <p class="meta">
          {{ character.civilization?.name || "无所属文明" }}
          <span v-if="character.faction"> · {{ character.faction.name }}</span>
        </p>
        <p class="meta">{{ statusLabel }} · {{ character.gender || "性别未填" }}</p>
        <p class="body">{{ character.description || "暂无简介" }}</p>

        <section class="block">
          <p class="eyebrow">角色声音</p>
          <ion-item>
            <ion-input v-model="voiceId" label="Voice ID" label-placement="stacked" />
          </ion-item>
          <ion-item>
            <ion-input v-model="voiceLanguage" label="Language" label-placement="stacked" />
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" :disabled="saving" @click="onSaveVoice">
            保存声音配置
          </ion-button>
          <p class="meta">复杂 TTS 生成请使用 Web。Voice Clone 尚未开放。</p>
        </section>

        <section class="block">
          <p class="eyebrow">人物关系</p>
          <article v-for="item in relations" :key="item.id" class="card">
            <p class="from">{{ item.fromCharacter.name }}</p>
            <p class="arrow">↓</p>
            <p class="type">{{ relationLabel(item.type) }}</p>
            <p class="arrow">↓</p>
            <p class="to">{{ item.toCharacter.name }}</p>
            <p v-if="item.description" class="desc">{{ item.description }}</p>
          </article>
          <p v-if="relations.length === 0" class="meta">还没有人物关系。</p>
        </section>

        <section v-if="otherCharacters.length > 0" class="block">
          <p class="eyebrow">添加关系</p>
          <ion-item>
            <ion-select v-model="toId" label="目标人物" label-placement="stacked" interface="popover">
              <ion-select-option v-for="item in otherCharacters" :key="item.id" :value="item.id">
                {{ item.name }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-select v-model="relType" label="关系类型" label-placement="stacked" interface="popover">
              <ion-select-option v-for="item in typeOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-button expand="block" class="ion-margin-top" :disabled="saving || !toId" @click="onAddRelation">
            保存关系
          </ion-button>
        </section>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonInput,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from "@ionic/vue";
import {
  getCharacterRelationTypeLabel,
  getCharacterStatusLabel,
  relationshipsForCharacter,
} from "@ai-drama-studio/core";
import { CharacterRelationType } from "@ai-drama-studio/types";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useCharacters } from "../composables/useCharacters";

const route = useRoute();
const projectId = String(route.params.id);
const characterId = String(route.params.characterId);
const { characters, relationships, loading, saving, error, load, createRelationship, update } =
  useCharacters();
const toId = ref("");
const relType = ref(CharacterRelationType.UNKNOWN);
const voiceId = ref("");
const voiceLanguage = ref("zh-CN");

const character = computed(
  () => characters.value.find((item) => item.id === characterId) ?? null,
);
const relations = computed(() =>
  character.value
    ? relationshipsForCharacter(relationships.value, character.value.id)
    : [],
);
const otherCharacters = computed(() =>
  characters.value.filter((item) => item.id !== characterId),
);
const statusLabel = computed(() =>
  character.value ? getCharacterStatusLabel(character.value.status) : "",
);
const typeOptions = Object.values(CharacterRelationType).map((item) => ({
  value: item,
  label: getCharacterRelationTypeLabel(item),
}));

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === "string") {
      void load(id);
    }
  },
  { immediate: true },
);

watch(
  character,
  (value) => {
    voiceId.value = value?.voiceProfile?.voiceId || "";
    voiceLanguage.value = value?.voiceProfile?.language || "zh-CN";
  },
  { immediate: true },
);

function relationLabel(type: CharacterRelationType) {
  return getCharacterRelationTypeLabel(type);
}

async function onSaveVoice() {
  await update(projectId, characterId, {
    voiceProfile: {
      voiceId: voiceId.value.trim() || null,
      language: voiceLanguage.value.trim() || null,
    },
  });
}

async function onAddRelation() {
  if (!toId.value) {
    return;
  }
  const created = await createRelationship(projectId, {
    fromCharacterId: characterId,
    toCharacterId: toId.value,
    type: relType.value,
  });
  if (created) {
    toId.value = "";
  }
}
</script>

<style scoped>
.eyebrow {
  color: #d4af37;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 11px;
}

h1 {
  margin: 8px 0 12px;
  font-size: 28px;
}

.meta,
.body,
.state,
.desc {
  color: #a1a1aa;
  line-height: 1.6;
}

.block {
  margin-top: 24px;
}

.card {
  margin-top: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  text-align: center;
}

.from,
.to {
  margin: 0;
  color: #f4f1ea;
}

.arrow,
.type {
  margin: 4px 0;
  color: #d4af37;
}
</style>
