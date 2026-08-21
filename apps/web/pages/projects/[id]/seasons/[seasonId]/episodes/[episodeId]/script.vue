<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="store.loading || story.loading"
      :error="store.error || story.error"
      loading-text="正在载入剧本…"
      :on-retry="reload"
    >
      <div class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">
              {{ episodeLabel }}
            </p>
            <h1 class="mt-1 font-display text-3xl">
              {{ episodeHeading }}
            </h1>
            <p class="mt-1 text-sm text-zinc-400">剧本</p>
            <p class="mt-2 text-sm text-zinc-500">
              把这一集的剧情转化为可执行的场景、动作与对白。
              {{ store.script ? statusLabel(store.script.status) : "本集尚未生成剧本。" }}
              <span v-if="store.script"> · v{{ store.script.version }}</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              :to="pathFor('workspace')"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
            >
              返回本集
            </NuxtLink>
            <ScriptGenerateModal
              :project-id="projectId"
              :episode-id="episodeId"
              :has-existing-script="Boolean(store.script && (store.script.scenes?.length || 0) > 0)"
              @applied="reload"
            />
            <button
              v-if="store.script && !store.locked && store.script.status !== ScriptStatus.READY"
              type="button"
              class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
              :disabled="store.saving"
              @click="onConfirm"
            >
              确认剧本
            </button>
            <NuxtLink
              v-if="store.script && (store.script.status === ScriptStatus.READY || store.locked)"
              :to="pathFor('storyboard')"
              class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
            >
              ✨ AI生成分镜
            </NuxtLink>
            <details class="relative">
              <summary class="cursor-pointer list-none rounded-xl border border-white/10 px-3 py-1.5 text-sm">
                更多
              </summary>
              <div class="absolute right-0 z-20 mt-2 min-w-[10rem] rounded-xl border border-white/10 bg-ink-900 p-2 text-sm shadow-xl">
                <button
                  v-if="store.script && !store.locked"
                  type="button"
                  class="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5 disabled:opacity-40"
                  :disabled="store.saving"
                  @click="onSave"
                >
                  保存
                </button>
                <button
                  v-if="store.missing"
                  type="button"
                  class="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5"
                  @click="onCreateBlank"
                >
                  创建空白剧本
                </button>
                <button
                  v-if="store.script && !store.locked"
                  type="button"
                  class="block w-full rounded-lg px-3 py-2 text-left text-amber-200 hover:bg-white/5"
                  @click="confirmLock = true"
                >
                  锁定剧本
                </button>
              </div>
            </details>
          </div>
        </div>

        <EpisodeProductionNav
          :project-id="projectId"
          :episode-id="episodeId"
          :season-id="seasonId"
          current="script"
        />

        <p
          v-if="store.actionError"
          class="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {{ store.actionError }}
        </p>
        <div
          v-if="!hasEpisodeOutline"
          class="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
        >
          这一集还没有稳定的大纲。请先补全 Episode Plan，再进入剧本生成。
          <NuxtLink :to="pathFor('plan')" class="ml-2 text-gold-300">去补全规划</NuxtLink>
        </div>

        <div v-if="store.script" class="grid gap-4 desktop:grid-cols-[220px_1fr_260px]">
          <aside class="rounded-2xl border border-white/5 bg-ink-800/60 p-3">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">Scenes</p>
              <button
                v-if="!store.locked"
                type="button"
                class="text-xs text-gold-300"
                @click="onAddScene"
              >
                新增
              </button>
            </div>
            <button
              v-for="(scene, index) in store.scenes"
              :key="scene.id"
              type="button"
              class="mb-2 block w-full rounded-xl border px-3 py-2 text-left text-sm"
              :class="scene.id === store.selectedScene?.id ? 'border-gold-400/40 bg-gold-400/10' : 'border-white/5'"
              draggable="true"
              @click="store.selectedSceneId = scene.id"
              @dragstart="dragSceneId = scene.id"
              @dragover.prevent
              @drop="onDropScene(scene.id)"
            >
              Scene {{ index + 1 }}
              <span class="mt-1 block text-zinc-400">{{ scene.title }}</span>
            </button>
          </aside>

          <article class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
            <form v-if="store.script" class="mb-4 grid gap-3 tablet:grid-cols-2" @submit.prevent="onSave">
              <input v-model="form.title" class="studio-field tablet:col-span-2" placeholder="剧本标题" :disabled="store.locked" />
              <input v-model="form.logline" class="studio-field tablet:col-span-2" placeholder="一句话" :disabled="store.locked" />
              <textarea v-model="form.summary" rows="2" class="studio-field resize-none tablet:col-span-2" placeholder="概要" :disabled="store.locked" />
            </form>
            <div v-if="sceneForm" class="space-y-3">
              <div class="flex items-start justify-between gap-2">
                <h2 class="font-display text-2xl">{{ sceneForm.title || "未命名场景" }}</h2>
                <button
                  v-if="!store.locked"
                  type="button"
                  class="text-xs text-red-300"
                  @click="onDeleteScene"
                >
                  删除场景
                </button>
              </div>
              <input v-model="sceneForm.title" class="studio-field" placeholder="场景标题" :disabled="store.locked" @change="onSaveScene" />
              <div class="grid gap-3 tablet:grid-cols-2">
                <input v-model="sceneForm.location" class="studio-field" placeholder="地点" :disabled="store.locked" @change="onSaveScene" />
                <input v-model="sceneForm.timeOfDay" class="studio-field" placeholder="时间" :disabled="store.locked" @change="onSaveScene" />
              </div>
              <textarea v-model="sceneForm.purpose" rows="2" class="studio-field resize-none" placeholder="场景目的" :disabled="store.locked" @change="onSaveScene" />
              <textarea v-model="sceneForm.conflict" rows="2" class="studio-field resize-none" placeholder="冲突" :disabled="store.locked" @change="onSaveScene" />
              <input v-model.number="sceneForm.estimatedDurationSeconds" type="number" min="1" class="studio-field" placeholder="预计时长（秒）" :disabled="store.locked" @change="onSaveScene" />

              <div class="flex items-center justify-between pt-2">
                <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">Script Blocks</p>
                <button v-if="!store.locked" type="button" class="text-xs text-gold-300" @click="onAddBlock">
                  新增段落
                </button>
              </div>
              <div
                v-for="block in store.selectedScene?.blocks || []"
                :key="block.id"
                class="rounded-xl border border-white/5 p-3"
              >
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <select
                    :value="block.type"
                    class="studio-field w-28"
                    :disabled="store.locked"
                    @change="onChangeBlockType(block.id, ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="type in blockTypes" :key="type" :value="type">{{ blockLabel(type) }}</option>
                  </select>
                  <select
                    v-if="block.type === ScriptBlockType.DIALOGUE"
                    :value="block.characterId || ''"
                    class="studio-field min-w-[8rem]"
                    :disabled="store.locked"
                    @change="onChangeBlockCharacter(block.id, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">未关联人物</option>
                    <option v-for="character in characters.characters" :key="character.id" :value="character.id">
                      {{ character.name }}
                    </option>
                  </select>
                  <TtsGenerationModal
                    v-if="block.type === ScriptBlockType.DIALOGUE"
                    :project-id="projectId"
                    :episode-id="episodeId"
                    :block="block"
                    :character="characterOf(block.characterId)"
                    @applied="reload"
                  />
                  <button
                    v-if="!store.locked"
                    type="button"
                    class="ml-auto text-xs text-red-300"
                    @click="store.removeBlock(projectId, episodeId, store.selectedScene!.id, block.id)"
                  >
                    删除
                  </button>
                </div>
                <textarea
                  :value="block.content"
                  rows="3"
                  class="studio-field resize-none"
                  :disabled="store.locked"
                  @change="onChangeBlockContent(block.id, ($event.target as HTMLTextAreaElement).value)"
                />
                <audio
                  v-if="block.type === ScriptBlockType.DIALOGUE && primaryAudioSrc(block)"
                  :src="primaryAudioSrc(block)"
                  controls
                  class="mt-2 w-full"
                />
              </div>
            </div>
          </article>

          <aside class="rounded-2xl border border-white/5 bg-ink-800/60 p-4 text-sm">
            <p class="text-xs uppercase tracking-[0.16em] text-gold-400/80">AI Assistant</p>
            <h3 class="mt-1 font-display text-xl">生成整集剧本</h3>
            <p class="mt-2 text-zinc-500">当前集：{{ episode?.title || "—" }}</p>
            <p class="mt-2 text-zinc-500">Story Bible：{{ story.bible?.title || "未创建" }}</p>
            <p class="mt-2 text-zinc-500">人物：{{ characters.characters.map((item) => item.name).join("、") || "暂无" }}</p>
            <p class="mt-2 text-zinc-500">连续性：{{ episode?.continuityNotes || "沿用上一集 Story State" }}</p>
            <p class="mt-4 text-xs text-zinc-600">润色 / 扩写 / 缩写 / 改对白将在后续阶段开放。</p>
            <WorldGenerationHistory :items="store.scriptGenerations" :type="GenerationTaskType.SCRIPT" />
          </aside>
        </div>
      </div>
    </PageState>

    <ConfirmDialog
      :open="confirmLock"
      title="锁定剧本？"
      message="锁定后本阶段将无法继续编辑。Phase 7 不会自动锁定。"
      confirm-label="确认锁定"
      @confirm="onLock"
      @cancel="confirmLock = false"
    />
  </section>
</template>

<script setup lang="ts">
import { getPrimaryBlockAsset, getScriptBlockTypeLabel, getScriptStatusLabel, resolveAssetDisplayUrl } from "@ai-drama-studio/core";
import {
  GenerationTaskType,
  ScriptBlockType,
  ScriptStatus,
  type ScriptBlock,
  type ScriptStatus as ScriptStatusType,
} from "@ai-drama-studio/types";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRuntimeConfig } from "#imports";
import { useEpisodeProductionPaths } from "~/composables/useEpisodeProduction";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useAiProviderStore } from "~/stores/ai-provider";
import { useCharacterStore } from "~/stores/character";
import { useScriptStore } from "~/stores/script";
import { useStoryStore } from "~/stores/story";

const route = useRoute();
const { pathFor, seasonId } = useEpisodeProductionPaths();
const config = useRuntimeConfig();
const { projectId } = useCurrentProject();
const store = useScriptStore();
const story = useStoryStore();
const characters = useCharacterStore();
const aiStore = useAiProviderStore();
const episodeId = computed(() => String(route.params.episodeId || ""));
const confirmLock = ref(false);
const dragSceneId = ref<string | null>(null);
const blockTypes = Object.values(ScriptBlockType);
const form = reactive({
  title: "",
  logline: "",
  summary: "",
});
const sceneForm = reactive({
  title: "",
  location: "",
  timeOfDay: "",
  purpose: "",
  conflict: "",
  estimatedDurationSeconds: 60 as number | null,
});

const episode = computed(
  () => story.projectEpisodes.find((item) => item.id === episodeId.value) ?? story.episode,
);
const episodeLabel = computed(() => {
  const current = episode.value;
  return current
    ? `E${String(current.number).padStart(2, "0")} · ${current.title}`
    : "本集剧本";
});
const episodeHeading = computed(
  () => episodeLabel.value,
);
const hasEpisodeOutline = computed(
  () => Boolean(episode.value?.synopsis?.trim() || episode.value?.outline?.trim()),
);

function statusLabel(status: ScriptStatusType) {
  return getScriptStatusLabel(status);
}

function blockLabel(type: ScriptBlockType) {
  return getScriptBlockTypeLabel(type);
}

function characterOf(characterId?: string | null) {
  if (!characterId) {
    return null;
  }
  return characters.characters.find((item) => item.id === characterId) ?? null;
}

function primaryAudioSrc(block: ScriptBlock) {
  const asset = getPrimaryBlockAsset(block.assets)?.asset;
  return asset?.url ? resolveAssetDisplayUrl(config.public.apiBase, asset.url) ?? "" : "";
}

function syncForms() {
  form.title = store.script?.title || "";
  form.logline = store.script?.logline || "";
  form.summary = store.script?.summary || "";
  const scene = store.selectedScene;
  sceneForm.title = scene?.title || "";
  sceneForm.location = scene?.location || "";
  sceneForm.timeOfDay = scene?.timeOfDay || "";
  sceneForm.purpose = scene?.purpose || "";
  sceneForm.conflict = scene?.conflict || "";
  sceneForm.estimatedDurationSeconds = scene?.estimatedDurationSeconds ?? 60;
}

async function reload() {
  await Promise.all([
    store.load(projectId.value, episodeId.value),
    story.loadProjectEpisodes(projectId.value),
    story.loadBible(projectId.value),
    characters.load(projectId.value),
    aiStore.loadProjectAiConfig(projectId.value),
  ]);
  syncForms();
}

watch(
  () => store.selectedScene?.id,
  () => syncForms(),
);

onMounted(() => {
  void reload();
});

async function onCreateBlank() {
  await store.create(projectId.value, episodeId.value, {
    title: episode.value?.title || "未命名剧本",
  });
  await reload();
}

async function onSave() {
  await store.update(projectId.value, episodeId.value, {
    title: form.title,
    logline: form.logline,
    summary: form.summary,
  });
}

async function onConfirm() {
  await store.update(projectId.value, episodeId.value, { status: ScriptStatus.READY });
}

async function onLock() {
  confirmLock.value = false;
  await store.update(projectId.value, episodeId.value, { status: ScriptStatus.LOCKED });
}

async function onSaveScene() {
  if (!store.selectedScene) {
    return;
  }
  await store.updateScene(projectId.value, episodeId.value, store.selectedScene.id, {
    title: sceneForm.title,
    location: sceneForm.location,
    timeOfDay: sceneForm.timeOfDay,
    purpose: sceneForm.purpose,
    conflict: sceneForm.conflict,
    estimatedDurationSeconds: sceneForm.estimatedDurationSeconds,
  });
}

async function onAddScene() {
  const number = (store.scenes[store.scenes.length - 1]?.number ?? 0) + 1;
  await store.createScene(projectId.value, episodeId.value, {
    number,
    title: `第 ${number} 场`,
  });
  syncForms();
}

async function onDeleteScene() {
  if (!store.selectedScene) {
    return;
  }
  await store.removeScene(projectId.value, episodeId.value, store.selectedScene.id);
  syncForms();
}

async function onDropScene(targetId: string) {
  if (!dragSceneId.value || dragSceneId.value === targetId) {
    return;
  }
  const ids = store.scenes.map((item) => item.id);
  const from = ids.indexOf(dragSceneId.value);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0) {
    return;
  }
  ids.splice(from, 1);
  ids.splice(to, 0, dragSceneId.value);
  await store.reorderScenes(projectId.value, episodeId.value, ids);
  dragSceneId.value = null;
}

async function onAddBlock() {
  if (!store.selectedScene) {
    return;
  }
  const order = (store.selectedScene.blocks?.[store.selectedScene.blocks.length - 1]?.order ?? 0) + 1;
  await store.createBlock(projectId.value, episodeId.value, store.selectedScene.id, {
    order,
    type: ScriptBlockType.ACTION,
    content: "镜头可见的动作。",
  });
}

async function onChangeBlockType(blockId: string, type: string) {
  if (!store.selectedScene) {
    return;
  }
  await store.updateBlock(projectId.value, episodeId.value, store.selectedScene.id, blockId, {
    type: type as ScriptBlockType,
  });
}

async function onChangeBlockCharacter(blockId: string, characterId: string) {
  if (!store.selectedScene) {
    return;
  }
  await store.updateBlock(projectId.value, episodeId.value, store.selectedScene.id, blockId, {
    characterId: characterId || null,
  });
}

async function onChangeBlockContent(blockId: string, content: string) {
  if (!store.selectedScene) {
    return;
  }
  await store.updateBlock(projectId.value, episodeId.value, store.selectedScene.id, blockId, {
    content,
  });
}
</script>
