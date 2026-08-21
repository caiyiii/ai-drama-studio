<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="loading"
      :error="error"
      loading-text="正在载入画面与配音…"
      :on-retry="load"
    >
      <div v-if="overview" class="space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <NuxtLink
              :to="pathFor('workspace')"
              class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80"
            >
              ← E{{ String(overview.episode.number).padStart(2, "0") }} · {{ overview.episode.title }}
            </NuxtLink>
            <h1 class="mt-1 font-display text-3xl">
              {{ focus === "audio" ? "配音" : "画面" }}
            </h1>
            <p class="mt-2 text-sm text-zinc-500">
              {{ focus === "audio" ? `对白 ${audio.label}` : `镜头 ${visual.label}` }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <AiGenerateButton
              v-if="focus !== 'audio'"
              :label="visualCtaLabel"
              :loading="generatingVisual"
              :disabled="!canGenerateVisual"
              :progress-text="visualProgressText"
              @click="onGenerateVisuals"
            />
            <AiGenerateButton
              v-else
              :label="audioCtaLabel"
              :loading="generatingAudio"
              :disabled="!canGenerateAudio"
              :progress-text="audioProgressText"
              @click="onGenerateAudio"
            />
          </div>
        </div>

        <EpisodeProductionNav
          :project-id="projectId"
          :episode-id="episodeId"
          :season-id="seasonId"
          :current="focus === 'audio' ? 'audio' : 'visual'"
        />

        <div
          v-if="blockerMessage"
          class="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          <p>{{ blockerMessage }}</p>
          <NuxtLink
            v-if="blockerTo"
            :to="blockerTo"
            class="mt-2 inline-block text-gold-300"
          >
            {{ blockerAction }}
          </NuxtLink>
        </div>

        <p
          v-if="actionMessage"
          class="rounded-xl border border-white/10 bg-ink-800/70 px-4 py-3 text-sm text-zinc-200"
        >
          {{ actionMessage }}
        </p>

        <section
          v-show="focus !== 'audio'"
          id="visual-section"
          class="rounded-3xl border border-white/5 bg-ink-900/70 p-5"
        >
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">画面</p>
              <h2 class="mt-1 font-display text-2xl">{{ visual.label }} 已完成</h2>
              <p class="mt-1 text-sm text-zinc-500">{{ visual.total }} 个镜头</p>
            </div>
            <AiGenerateButton
              :label="visualCtaLabel"
              :loading="generatingVisual"
              :disabled="!canGenerateVisual"
              :progress-text="visualProgressText"
              @click="onGenerateVisuals"
            />
          </div>

          <div class="mt-4 space-y-3">
            <article
              v-for="shot in shotRows"
              :key="shot.id"
              class="rounded-2xl border border-white/5 bg-ink-800/70 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm text-zinc-200">
                  Shot {{ String(shot.number).padStart(3, "0") }}
                </p>
                <span class="text-xs" :class="shot.ready ? 'text-emerald-300' : 'text-amber-200'">
                  {{ shot.ready ? "已完成" : "待生成" }}
                </span>
              </div>
              <p class="mt-2 text-xs text-zinc-500">
                图片：{{ shot.image }} · 视频：{{ shot.video }}
              </p>
            </article>
            <p v-if="!shotRows.length" class="text-sm text-zinc-500">还没有镜头。请先完成分镜。</p>
          </div>
        </section>

        <section
          v-show="focus === 'audio'"
          id="audio-section"
          class="rounded-3xl border border-white/5 bg-ink-900/70 p-5"
        >
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">配音</p>
              <h2 class="mt-1 font-display text-2xl">{{ audio.label }} 已完成</h2>
              <p class="mt-1 text-sm text-zinc-500">{{ audio.total }} 条对白</p>
            </div>
            <AiGenerateButton
              :label="audioCtaLabel"
              :loading="generatingAudio"
              :disabled="!canGenerateAudio"
              :progress-text="audioProgressText"
              @click="onGenerateAudio"
            />
          </div>

          <div class="mt-4 space-y-3">
            <article
              v-for="item in dialogueRows"
              :key="item.id"
              class="rounded-2xl border border-white/5 bg-ink-800/70 p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm text-zinc-200">{{ item.character }}：{{ item.content }}</p>
                <span class="text-xs" :class="item.ready ? 'text-emerald-300' : 'text-amber-200'">
                  {{ item.ready ? "已生成" : item.voiceMissing ? "需配置声音" : "未生成" }}
                </span>
              </div>
              <NuxtLink
                v-if="item.voiceMissing && item.characterId"
                :to="`/projects/${projectId}/characters/${item.characterId}`"
                class="mt-2 inline-block text-xs text-gold-300"
              >
                配置角色声音
              </NuxtLink>
            </article>
            <p v-if="!dialogueRows.length" class="text-sm text-zinc-500">还没有对白块。</p>
          </div>
        </section>

        <div class="flex flex-wrap gap-2">
          <NuxtLink
            :to="pathFor('workspace')"
            class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
          >
            返回本集
          </NuxtLink>
          <NuxtLink
            v-if="focus !== 'audio' && visual.ready >= visual.total && visual.total > 0"
            :to="userStepPath(projectId, episodeId, 'audio', seasonId)"
            class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
          >
            下一步：AI生成配音
          </NuxtLink>
          <NuxtLink
            v-if="focus === 'audio' && audio.ready >= audio.total && audio.total > 0"
            :to="userStepPath(projectId, episodeId, 'render', seasonId)"
            class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
          >
            下一步：AI生成成片
          </NuxtLink>
        </div>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import {
  AssetType,
  type Character,
  type EpisodeOverview,
  type Script,
  type Storyboard,
} from "@ai-drama-studio/types";
import { getPrimaryBlockAsset, getPrimaryShotAsset } from "@ai-drama-studio/core";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "#imports";
import { useEpisodeProductionPaths } from "~/composables/useEpisodeProduction";
import {
  audioReadyLabel,
  userStepPath,
  visualReadyLabel,
} from "~/composables/useProductionUx";
import { useEpisodeWorkspaceContext, useNuxtApp } from "#imports";
import { ApiError } from "@ai-drama-studio/api-client";

const route = useRoute();
const { pathFor, seasonId } = useEpisodeProductionPaths();
const { $api } = useNuxtApp();
const { projectId } = useEpisodeWorkspaceContext();
const episodeId = computed(() => String(route.params.episodeId || ""));
const focus = computed(() => (String(route.query.focus || "") === "audio" ? "audio" : "visual"));

const loading = ref(false);
const error = ref<string | null>(null);
const overview = ref<EpisodeOverview | null>(null);
const script = ref<Script | null>(null);
const storyboard = ref<Storyboard | null>(null);
const characters = ref<Character[]>([]);
const generatingVisual = ref(false);
const generatingAudio = ref(false);
const actionMessage = ref<string | null>(null);
const visualDone = ref(0);
const visualTotalJob = ref(0);
const audioDone = ref(0);
const audioTotalJob = ref(0);
const imageConfigured = ref(true);
const ttsConfigured = ref(true);

const visual = computed(() =>
  overview.value ? visualReadyLabel(overview.value) : { ready: 0, total: 0, label: "0 / 0" },
);
const audio = computed(() =>
  overview.value ? audioReadyLabel(overview.value) : { ready: 0, total: 0, label: "0 / 0" },
);

const shotRows = computed(() =>
  (storyboard.value?.shots ?? []).map((shot) => {
    const image = Boolean(getPrimaryShotAsset(shot.assets, AssetType.IMAGE)?.asset);
    const video = Boolean(getPrimaryShotAsset(shot.assets, AssetType.VIDEO)?.asset);
    return {
      id: shot.id,
      number: shot.shotNumber,
      image: image ? "已生成" : "未生成",
      video: video ? "已生成" : "未生成",
      ready: image || video,
    };
  }),
);

const characterVoiceMap = computed(() => {
  const map = new Map<string, string | null>();
  for (const character of characters.value) {
    const voiceId = character.voiceProfile?.voiceId?.trim() || null;
    map.set(character.id, voiceId);
  }
  return map;
});

const dialogueRows = computed(() =>
  (script.value?.scenes ?? []).flatMap((scene) =>
    (scene.blocks ?? [])
      .filter((block) => block.type === "DIALOGUE")
      .map((block) => {
        const characterId = block.characterId || block.character?.id || null;
        const voiceId = characterId ? characterVoiceMap.value.get(characterId) : null;
        return {
          id: block.id,
          character: block.character?.name || "对白",
          characterId,
          content: block.content,
          ready: Boolean(getPrimaryBlockAsset(block.assets)?.asset),
          voiceMissing: Boolean(characterId) && !voiceId,
        };
      }),
  ),
);

const missingVisualShots = computed(() => shotRows.value.filter((s) => !s.ready));
const missingAudioBlocks = computed(() => dialogueRows.value.filter((d) => !d.ready));
const voiceBlocked = computed(() => missingAudioBlocks.value.some((d) => d.voiceMissing));

const visualCtaLabel = computed(() => {
  if (visual.value.total === 0) return "✨ AI生成画面";
  if (visual.value.ready >= visual.value.total) return "画面已完成";
  if (visual.value.ready === 0) return "✨ AI生成画面";
  return `✨ 生成剩余 ${visual.value.total - visual.value.ready} 个画面`;
});
const audioCtaLabel = computed(() => {
  if (audio.value.total === 0) return "✨ AI生成配音";
  if (audio.value.ready >= audio.value.total) return "配音已完成";
  if (audio.value.ready === 0) return "✨ AI生成配音";
  return `✨ 生成剩余 ${audio.value.total - audio.value.ready} 条配音`;
});
const canGenerateVisual = computed(
  () => imageConfigured.value && missingVisualShots.value.length > 0 && !generatingVisual.value,
);
const canGenerateAudio = computed(
  () =>
    ttsConfigured.value &&
    missingAudioBlocks.value.length > 0 &&
    !voiceBlocked.value &&
    !generatingAudio.value,
);
const visualProgressText = computed(() =>
  generatingVisual.value ? `已完成 ${visualDone.value} / ${visualTotalJob.value}` : null,
);
const audioProgressText = computed(() =>
  generatingAudio.value ? `已完成 ${audioDone.value} / ${audioTotalJob.value}` : null,
);

const blockerMessage = computed(() => {
  if (focus.value !== "audio" && !imageConfigured.value) {
    return "当前项目尚未配置图像生成服务，无法生成画面。";
  }
  if (focus.value === "audio" && !ttsConfigured.value) {
    return "当前项目尚未配置语音生成服务，无法生成配音。";
  }
  if (focus.value === "audio" && voiceBlocked.value) {
    return "部分角色还没有配置声音，请先配置角色 Voice。";
  }
  return null;
});
const blockerTo = computed(() => {
  if (!imageConfigured.value && focus.value !== "audio") {
    return `/projects/${projectId.value}/settings#IMAGE`;
  }
  if (!ttsConfigured.value && focus.value === "audio") {
    return `/projects/${projectId.value}/settings#TTS`;
  }
  if (voiceBlocked.value) {
    const first = missingAudioBlocks.value.find((d) => d.voiceMissing && d.characterId);
    return first?.characterId
      ? `/projects/${projectId.value}/characters/${first.characterId}`
      : `/projects/${projectId.value}/characters`;
  }
  return null;
});
const blockerAction = computed(() => {
  if (voiceBlocked.value) return "配置角色声音";
  return "配置 AI";
});

async function waitTask(taskId: string) {
  for (let i = 0; i < 90; i += 1) {
    const task = await $api.getGeneration(projectId.value, taskId);
    if (task.status === "SUCCEEDED") return task;
    if (task.status === "FAILED") {
      throw new Error(task.error || "生成失败");
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("生成超时");
}

async function onGenerateVisuals() {
  if (!canGenerateVisual.value) return;
  generatingVisual.value = true;
  actionMessage.value = null;
  error.value = null;
  const targets = missingVisualShots.value.map((s) => s.id);
  visualTotalJob.value = targets.length;
  visualDone.value = 0;
  let failed = 0;
  try {
    for (const shotId of targets) {
      try {
        const task = await $api.createImageGeneration(projectId.value, { shotId, count: 1 });
        const done = await waitTask(task.id);
        await $api.applyImageGeneration(projectId.value, done.id);
        visualDone.value += 1;
      } catch (err) {
        failed += 1;
        if (err instanceof ApiError && err.code === "IMAGE_PROVIDER_NOT_CONFIGURED") {
          imageConfigured.value = false;
          break;
        }
        actionMessage.value =
          err instanceof Error ? err.message : "部分镜头画面生成失败，可稍后重试。";
      }
      await load();
    }
    if (failed === 0 && visualDone.value > 0) {
      actionMessage.value = `画面生成完成：${visualDone.value} / ${visualTotalJob.value}`;
    } else if (failed > 0) {
      actionMessage.value = `画面完成 ${visualDone.value}，失败 ${failed}。可重试剩余项。`;
    }
  } finally {
    generatingVisual.value = false;
    await load();
  }
}

async function onGenerateAudio() {
  if (!canGenerateAudio.value) return;
  generatingAudio.value = true;
  actionMessage.value = null;
  error.value = null;
  const targets = missingAudioBlocks.value.filter((d) => !d.voiceMissing);
  audioTotalJob.value = targets.length;
  audioDone.value = 0;
  let failed = 0;
  try {
    for (const block of targets) {
      try {
        const task = await $api.createTtsGeneration(projectId.value, {
          episodeId: episodeId.value,
          scriptBlockId: block.id,
        });
        const done = await waitTask(task.id);
        await $api.applyTtsGeneration(projectId.value, done.id);
        audioDone.value += 1;
      } catch (err) {
        failed += 1;
        if (
          err instanceof ApiError &&
          (err.code === "TTS_PROVIDER_NOT_CONFIGURED" || err.code === "TTS_VOICE_REQUIRED")
        ) {
          if (err.code === "TTS_PROVIDER_NOT_CONFIGURED") ttsConfigured.value = false;
          break;
        }
        actionMessage.value =
          err instanceof Error ? err.message : "部分对白配音失败，可稍后重试。";
      }
      await load();
    }
    if (failed === 0 && audioDone.value > 0) {
      actionMessage.value = `配音生成完成：${audioDone.value} / ${audioTotalJob.value}`;
    } else if (failed > 0) {
      actionMessage.value = `配音完成 ${audioDone.value}，失败 ${failed}。可重试剩余项。`;
    }
  } finally {
    generatingAudio.value = false;
    await load();
  }
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [currentOverview, currentScript, currentStoryboard, aiConfig, characterPage] =
      await Promise.all([
        $api.getEpisodeProductionOverview(projectId.value, episodeId.value),
        $api.getScript(projectId.value, episodeId.value).catch(() => null),
        $api.getEpisodeStoryboard(projectId.value, episodeId.value).catch(() => null),
        $api.getProjectAiConfig(projectId.value).catch(() => null),
        $api.listCharacters(projectId.value, { pageSize: 100 }).catch(() => null),
      ]);
    overview.value = currentOverview;
    script.value = currentScript;
    storyboard.value = currentStoryboard;
    characters.value = characterPage?.items ?? [];
    if (aiConfig) {
      imageConfigured.value = Boolean(aiConfig.IMAGE?.configured);
      ttsConfigured.value = Boolean(aiConfig.TTS?.configured);
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await load();
  await nextTick();
  const el = document.getElementById(focus.value === "audio" ? "audio-section" : "visual-section");
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
});

watch(focus, async () => {
  await nextTick();
  const el = document.getElementById(focus.value === "audio" ? "audio-section" : "visual-section");
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
});
</script>
