<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="store.loading"
      :error="store.error"
      loading-text="正在载入季详情…"
      :on-retry="reload"
    >
      <div v-if="store.season" class="space-y-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Season {{ store.season.number }}</p>
            <h1 class="mt-1 font-display text-3xl">{{ store.season.title }}</h1>
            <p class="mt-2 text-sm text-zinc-500">{{ statusLabel(store.season.status) }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="rounded-xl border border-white/10 px-3 py-1.5 text-sm" @click="showEpisode = true">
              创建剧集
            </button>
            <button type="button" class="rounded-xl border border-red-500/30 px-3 py-1.5 text-sm text-red-300" @click="confirmDelete = true">
              删除季
            </button>
          </div>
        </div>

        <p v-if="store.actionError" class="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ store.actionError }}
        </p>

        <div class="grid gap-4 rounded-3xl border border-white/5 bg-ink-900/60 p-5 tablet:grid-cols-[1.3fr_0.9fr]">
          <div class="space-y-3">
            <div>
              <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Planning Center</p>
              <h2 class="mt-1 font-display text-2xl">AI 规划中心</h2>
              <p class="mt-1 text-sm text-zinc-500">
                先预览，再确认 Apply。已有 Episode 不会被静默覆盖。
              </p>
            </div>
            <div class="grid gap-3 tablet:grid-cols-3">
              <div class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
                <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">首次规划</p>
                <p class="mt-2 text-sm text-zinc-400">
                  适合空白 Season，从 E01 开始建立整季节奏。
                </p>
                <div class="mt-4">
                  <SeasonOutlineGenerateModal
                    :project-id="projectId"
                    :season-id="seasonId"
                    mode="INITIAL"
                    @applied="reload"
                  />
                </div>
              </div>
              <div class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
                <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">继续规划</p>
                <p class="mt-2 text-sm text-zinc-400">
                  保留已有剧集，从 E{{ String(nextEpisodeNumber).padStart(2, "0") }} 开始追加新集。
                </p>
                <div class="mt-4">
                  <SeasonOutlineGenerateModal
                    :project-id="projectId"
                    :season-id="seasonId"
                    mode="CONTINUE"
                    @applied="reload"
                  />
                </div>
              </div>
              <div class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
                <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">重新规划</p>
                <p class="mt-2 text-sm text-zinc-400">
                  重新生成整季方案，但仍需要你显式确认后才会应用。
                </p>
                <div class="mt-4">
                  <SeasonOutlineGenerateModal
                    :project-id="projectId"
                    :season-id="seasonId"
                    mode="REPLAN"
                    @applied="reload"
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="rounded-2xl border border-white/5 bg-ink-800/70 p-4">
            <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">当前规划状态</p>
            <dl class="mt-3 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-zinc-500">已有剧集</dt>
                <dd class="text-white">{{ store.episodes.length }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-zinc-500">下一建议集数</dt>
                <dd class="text-white">E{{ String(nextEpisodeNumber).padStart(2, "0") }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-zinc-500">最近一次规划</dt>
                <dd class="text-white">{{ latestPlanningLabel }}</dd>
              </div>
            </dl>
            <p class="mt-4 text-xs text-zinc-500">
              Preview 会区分“已有剧集”和“本次新增剧集”，便于你确认哪些内容会写入。
            </p>
          </div>
        </div>

        <form class="space-y-3" @submit.prevent="onSave">
          <input v-model="form.title" class="studio-field" />
          <textarea v-model="form.synopsis" rows="3" class="studio-field resize-none" placeholder="简介" />
          <textarea v-model="form.outline" rows="6" class="studio-field resize-none" placeholder="大纲" />
          <button type="submit" :disabled="store.saving" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950">
            保存季信息
          </button>
        </form>

        <div>
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Episode List</p>
          <h2 class="mt-1 font-display text-2xl">已规划剧集</h2>
          <p class="mt-1 text-xs text-zinc-500">
            这里是当前 Season 的可执行剧集列表。拖动排序会通过后端事务重编号。
          </p>
          <ol class="mt-4 space-y-2">
            <li
              v-for="item in store.episodes"
              :key="item.id"
              draggable="true"
              class="cursor-grab rounded-2xl border border-white/5 bg-ink-800/60 p-4"
              @dragstart="onDragStart(item.id)"
              @dragover.prevent
              @drop="onDrop(item.id)"
            >
              <NuxtLink :to="`/projects/${projectId}/episodes/${item.id}`" class="block">
                <p class="text-xs text-gold-300">E{{ String(item.number).padStart(2, "0") }}</p>
                <h3 class="mt-1 font-display text-xl">{{ item.title }}</h3>
                <p class="mt-1 text-sm text-zinc-500">{{ item.synopsis || "尚未填写简介" }}</p>
                <p class="mt-3 text-sm text-gold-300">进入制作 →</p>
              </NuxtLink>
            </li>
          </ol>
        </div>

        <WorldGenerationHistory :items="store.seasonOutlineGenerations" :type="GenerationTaskType.SEASON_OUTLINE" />
      </div>
    </PageState>

    <AppModal :open="showEpisode" title="新建剧集" description="先创建草稿，再用 AI 生成本集大纲。" @close="showEpisode = false">
      <form class="space-y-3" @submit.prevent="onCreateEpisode">
        <input v-model.number="episodeForm.number" type="number" min="1" required class="studio-field" placeholder="集数" />
        <input v-model="episodeForm.title" required class="studio-field" placeholder="标题" />
        <textarea v-model="episodeForm.synopsis" rows="3" class="studio-field resize-none" placeholder="简介" />
        <input v-model.number="episodeForm.durationSeconds" type="number" min="30" class="studio-field" placeholder="时长（秒）" />
        <button type="submit" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950">创建草稿</button>
      </form>
    </AppModal>

    <ConfirmDialog
      :open="confirmDelete"
      title="删除这一季？"
      message="如果该季下仍有剧集，删除会被拒绝。"
      @confirm="onDelete"
      @cancel="confirmDelete = false"
    />
  </section>
</template>

<script setup lang="ts">
import { getSeasonStatusLabel } from "@ai-drama-studio/core";
import { GenerationTaskType, type SeasonStatus } from "@ai-drama-studio/types";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useStoryStore } from "~/stores/story";

const route = useRoute();
const { projectId } = useCurrentProject();
const store = useStoryStore();
const seasonId = computed(() => String(route.params.seasonId || ""));
const draggingId = ref<string | null>(null);
const showEpisode = ref(false);
const confirmDelete = ref(false);
const form = reactive({ title: "", synopsis: "", outline: "" });
const episodeForm = reactive({ number: 1, title: "", synopsis: "", durationSeconds: 300 });
const nextEpisodeNumber = computed(() =>
  store.episodes.reduce((max, item) => Math.max(max, item.number), 0) + 1,
);
const latestPlanningLabel = computed(() => {
  const task = store.seasonOutlineGenerations[0];
  if (!task?.createdAt) {
    return "尚无记录";
  }
  return new Date(task.createdAt).toLocaleString("zh-CN");
});

function statusLabel(status: SeasonStatus) {
  return getSeasonStatusLabel(status);
}

function syncForm() {
  form.title = store.season?.title || "";
  form.synopsis = store.season?.synopsis || "";
  form.outline = store.season?.outline || "";
}

async function reload() {
  await store.loadSeason(projectId.value, seasonId.value);
  syncForm();
}

onMounted(() => {
  void reload();
});

watch(seasonId, () => {
  void reload();
});

async function onSave() {
  await store.updateSeason(projectId.value, seasonId.value, { ...form });
}

async function onCreateEpisode() {
  const created = await store.createEpisode(projectId.value, seasonId.value, {
    number: episodeForm.number,
    title: episodeForm.title.trim(),
    synopsis: episodeForm.synopsis,
    durationSeconds: episodeForm.durationSeconds,
  });
  if (created) {
    showEpisode.value = false;
  }
}

function onDragStart(id: string) {
  draggingId.value = id;
}

async function onDrop(targetId: string) {
  if (!draggingId.value || draggingId.value === targetId) {
    return;
  }
  const ids = store.episodes.map((item) => item.id);
  const from = ids.indexOf(draggingId.value);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0) {
    return;
  }
  ids.splice(from, 1);
  ids.splice(to, 0, draggingId.value);
  draggingId.value = null;
  await store.reorderEpisodes(projectId.value, seasonId.value, ids);
}

async function onDelete() {
  confirmDelete.value = false;
  const ok = await store.removeSeason(projectId.value, seasonId.value);
  if (ok) {
    await navigateTo(`/projects/${projectId.value}/seasons`);
  }
}
</script>
