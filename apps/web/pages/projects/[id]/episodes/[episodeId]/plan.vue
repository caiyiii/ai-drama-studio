<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="loading"
      :error="error"
      loading-text="正在载入 Episode Plan…"
      :on-retry="load"
    >
      <div v-if="episode && overview" class="space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">剧集规划</p>
            <h1 class="mt-1 font-display text-3xl">
              E{{ String(episode.number).padStart(2, "0") }} · {{ episode.title }}
            </h1>
            <p class="mt-1 text-sm text-zinc-400">剧集规划</p>
            <p class="mt-2 text-sm text-zinc-500">
              定义这一集讲什么。这不是剧本：剧本才是可拍摄的场景、动作与对白。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink :to="workspacePath(episodeId)" class="rounded-xl border border-white/10 px-3 py-1.5 text-sm">
              返回本集工作台
            </NuxtLink>
            <NuxtLink
              :to="planReady ? `/projects/${projectId}/episodes/${episodeId}/script` : workspacePath(episodeId)"
              class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
            >
              {{ planReady ? "生成剧本" : "先补全规划" }}
            </NuxtLink>
          </div>
        </div>

        <EpisodeProductionNav
          :project-id="projectId"
          :episode-id="episodeId"
          current="plan"
        />

        <p
          v-if="saveMessage"
          class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {{ saveMessage }}
        </p>

        <div class="grid gap-4 desktop:grid-cols-[1.1fr_0.9fr]">
          <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Planning Status</p>
                <h2 class="mt-1 font-display text-2xl">本集规划是否可进入剧本</h2>
              </div>
              <span class="rounded-full border px-3 py-1 text-xs" :class="planReady ? 'border-emerald-500/30 text-emerald-300' : 'border-amber-500/30 text-amber-200'">
                {{ planReady ? "READY" : "MISSING" }}
              </span>
            </div>
            <div class="mt-4 grid gap-3 tablet:grid-cols-2">
              <div class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
                <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">Episode Goal</p>
                <p class="mt-2 text-sm text-zinc-300">{{ overview.plan.goal || "未填写" }}</p>
              </div>
              <div class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
                <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">Core Conflict</p>
                <p class="mt-2 text-sm text-zinc-300">{{ overview.plan.conflict || "未填写" }}</p>
              </div>
              <div class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
                <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">承接上一集</p>
                <p class="mt-2 text-sm text-zinc-300">{{ overview.plan.previousEpisode || "未填写" }}</p>
              </div>
              <div class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
                <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">导向下一集</p>
                <p class="mt-2 text-sm text-zinc-300">{{ overview.plan.nextEpisode || "未填写" }}</p>
              </div>
            </div>
            <p class="mt-4 text-sm text-zinc-500">
              剧本生成现在会在服务端检查 `synopsis` 和 `outline`，缺少任一项都不会继续。
            </p>
          </section>

          <section class="rounded-3xl border border-white/5 bg-ink-900/70 p-5">
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Next Step</p>
            <h2 class="mt-1 font-display text-2xl">{{ planReady ? "进入剧本阶段" : "先完成规划必填项" }}</h2>
            <p class="mt-2 text-sm text-zinc-400">
              {{ planReady ? "规划已经具备生成剧本的最低条件，可以进入 Script。" : "至少补齐一句 synopsis 和一份 outline，确保 AI 与后续人工创作基于同一集计划。" }}
            </p>
            <NuxtLink
              :to="planReady ? `/projects/${projectId}/episodes/${episodeId}/script` : '#plan-form'"
              class="mt-4 inline-flex rounded-xl border border-white/10 px-3 py-1.5 text-sm"
            >
              {{ planReady ? "打开剧本页" : "定位到表单" }}
            </NuxtLink>
          </section>
        </div>

        <form id="plan-form" class="space-y-6 rounded-3xl border border-white/5 bg-ink-900/70 p-5" @submit.prevent="save">
          <div>
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Edit Plan</p>
            <h2 class="mt-1 font-display text-2xl">更新本集规划</h2>
          </div>

          <div class="grid gap-4 desktop:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">标题</span>
              <input v-model="form.title" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">时长（秒）</span>
              <input v-model.number="form.durationSeconds" type="number" min="1" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
          </div>

          <label class="block space-y-2">
            <span class="text-sm text-zinc-300">Synopsis</span>
            <textarea v-model="form.synopsis" rows="4" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
          </label>

          <label class="block space-y-2">
            <span class="text-sm text-zinc-300">Outline</span>
            <textarea v-model="form.outline" rows="8" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
          </label>

          <div class="grid gap-4 desktop:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">这一集要完成什么</span>
              <input v-model="form.goal" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">核心冲突</span>
              <input v-model="form.conflict" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">角色（逗号分隔）</span>
              <input v-model="form.keyCharacters" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">地点（逗号分隔）</span>
              <input v-model="form.keyLocations" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">基调</span>
              <input v-model="form.mood" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">节奏</span>
              <input v-model="form.pace" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">开场</span>
              <input v-model="form.opening" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">高潮</span>
              <input v-model="form.climax" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">结尾</span>
              <input v-model="form.ending" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">承接上一集</span>
              <input v-model="form.previousEpisode" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">起始状态</span>
              <input v-model="form.startState" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
            <label class="space-y-2">
              <span class="text-sm text-zinc-300">结束状态</span>
              <input v-model="form.endState" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
            </label>
          </div>

          <label class="block space-y-2">
            <span class="text-sm text-zinc-300">导向下一集</span>
            <input v-model="form.nextEpisode" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
          </label>

          <label class="block space-y-2">
            <span class="text-sm text-zinc-300">Continuity Notes</span>
            <textarea v-model="form.continuityNotes" rows="4" class="w-full rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3 text-sm outline-none" />
          </label>

          <div class="flex flex-wrap gap-2">
            <button type="submit" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950" :disabled="saving">
              {{ saving ? "保存中…" : "保存规划" }}
            </button>
            <button type="button" class="rounded-xl border border-white/10 px-4 py-2 text-sm" :disabled="saving" @click="resetForm">
              重置
            </button>
          </div>
        </form>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import type { Episode, EpisodeOverview } from "@ai-drama-studio/types";
import { computed, onMounted, reactive, ref } from "vue";
import { useEpisodeWorkspaceContext, useNuxtApp, useRoute } from "#imports";

const route = useRoute();
const { $api } = useNuxtApp();
const { projectId, resolveSeasonId, workspacePath } = useEpisodeWorkspaceContext();
const episodeId = computed(() => String(route.params.episodeId || ""));

const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const saveMessage = ref<string | null>(null);
const seasonId = ref("");
const episode = ref<Episode | null>(null);
const overview = ref<EpisodeOverview | null>(null);

const form = reactive({
  title: "",
  synopsis: "",
  outline: "",
  durationSeconds: null as number | null,
  goal: "",
  conflict: "",
  keyCharacters: "",
  keyLocations: "",
  mood: "",
  pace: "",
  opening: "",
  climax: "",
  ending: "",
  startState: "",
  endState: "",
  previousEpisode: "",
  nextEpisode: "",
  continuityNotes: "",
});

const planReady = computed(() =>
  Boolean(episode.value?.synopsis?.trim() && episode.value?.outline?.trim()),
);

function toCsv(value: string[]) {
  return value.join(", ");
}

function resetForm() {
  if (!episode.value || !overview.value) {
    return;
  }
  form.title = episode.value.title;
  form.synopsis = episode.value.synopsis || "";
  form.outline = episode.value.outline || "";
  form.durationSeconds = episode.value.durationSeconds ?? null;
  form.goal = overview.value.plan.goal || "";
  form.conflict = overview.value.plan.conflict || "";
  form.keyCharacters = toCsv(overview.value.plan.keyCharacters);
  form.keyLocations = toCsv(overview.value.plan.keyLocations);
  form.mood = overview.value.plan.mood || "";
  form.pace = overview.value.plan.pace || "";
  form.opening = overview.value.plan.opening || "";
  form.climax = overview.value.plan.climax || "";
  form.ending = overview.value.plan.ending || "";
  form.startState = overview.value.plan.startState || "";
  form.endState = overview.value.plan.endState || "";
  form.previousEpisode = overview.value.plan.previousEpisode || "";
  form.nextEpisode = overview.value.plan.nextEpisode || "";
  form.continuityNotes = episode.value.continuityNotes || "";
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function load() {
  loading.value = true;
  error.value = null;
  saveMessage.value = null;
  try {
    seasonId.value = await resolveSeasonId(episodeId.value);
    const [currentEpisode, currentOverview] = await Promise.all([
      $api.getEpisode(projectId.value, seasonId.value, episodeId.value),
      $api.getEpisodeOverview(projectId.value, seasonId.value, episodeId.value),
    ]);
    episode.value = currentEpisode;
    overview.value = currentOverview;
    resetForm();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "加载 Episode Plan 失败";
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!seasonId.value) {
    return;
  }
  saving.value = true;
  error.value = null;
  saveMessage.value = null;
  try {
    await $api.updateEpisode(projectId.value, seasonId.value, episodeId.value, {
      title: form.title.trim(),
      synopsis: form.synopsis.trim() || null,
      outline: form.outline.trim() || null,
      durationSeconds: form.durationSeconds ?? null,
      continuityNotes: form.continuityNotes.trim() || null,
      metadata: {
        goal: form.goal.trim() || null,
        conflict: form.conflict.trim() || null,
        keyCharacters: parseList(form.keyCharacters),
        keyLocations: parseList(form.keyLocations),
        mood: form.mood.trim() || null,
        pace: form.pace.trim() || null,
        opening: form.opening.trim() || null,
        climax: form.climax.trim() || null,
        ending: form.ending.trim() || null,
        startState: form.startState.trim() || null,
        endState: form.endState.trim() || null,
        previousEpisode: form.previousEpisode.trim() || null,
        nextEpisode: form.nextEpisode.trim() || null,
      },
    });
    saveMessage.value = "Episode Plan 已更新。";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "保存 Episode Plan 失败";
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>
