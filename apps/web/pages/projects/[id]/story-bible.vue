<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">Story Bible</p>
        <h1 class="mt-1 font-display text-3xl">故事圣经</h1>
        <p class="mt-2 max-w-2xl text-sm text-zinc-500">
          创作规则与故事承诺。它不是世界观副本，也不会替代人物设定。
        </p>
      </div>
      <StoryBibleGenerateModal
        v-if="projectId"
        :project-id="projectId"
        :has-bible="Boolean(store.bible)"
        @applied="() => store.loadBible(projectId)"
      />
    </div>

    <PageState
      :loading="store.loading"
      :error="store.error"
      loading-text="正在载入故事圣经…"
      :on-retry="() => store.loadBible(projectId)"
    >
      <p v-if="store.actionError" class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {{ store.actionError }}
      </p>

      <form class="space-y-5" @submit.prevent="onSave">
        <div class="grid gap-4 tablet:grid-cols-2">
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">作品名称</span>
            <input v-model="form.title" required class="studio-field mt-2" />
          </label>
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">目标受众</span>
            <input v-model="form.audience" class="studio-field mt-2" />
          </label>
        </div>
        <label class="block text-sm">
          <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">故事一句话</span>
          <textarea v-model="form.logline" rows="2" class="studio-field mt-2 resize-none" />
        </label>
        <label class="block text-sm">
          <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">故事前提</span>
          <textarea v-model="form.premise" rows="4" class="studio-field mt-2 resize-none" />
        </label>
        <div class="grid gap-4 tablet:grid-cols-3">
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">主题</span>
            <input v-model="form.theme" class="studio-field mt-2" />
          </label>
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">基调</span>
            <input v-model="form.tone" class="studio-field mt-2" />
          </label>
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">风格</span>
            <input v-model="form.style" class="studio-field mt-2" />
          </label>
        </div>
        <label class="block text-sm">
          <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">故事承诺</span>
          <textarea v-model="form.storyPromise" rows="3" class="studio-field mt-2 resize-none" />
        </label>
        <div class="grid gap-4 tablet:grid-cols-2">
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">世界规则</span>
            <textarea v-model="form.worldRules" rows="4" class="studio-field mt-2 resize-none" placeholder="每行一条" />
          </label>
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">人物规则</span>
            <textarea v-model="form.characterRules" rows="4" class="studio-field mt-2 resize-none" />
          </label>
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">叙事规则</span>
            <textarea v-model="form.narrativeRules" rows="4" class="studio-field mt-2 resize-none" />
          </label>
          <label class="block text-sm">
            <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">禁止事项</span>
            <textarea v-model="form.forbidden" rows="4" class="studio-field mt-2 resize-none" />
          </label>
        </div>
        <label class="block text-sm">
          <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">时间线</span>
          <textarea v-model="form.timelineSummary" rows="3" class="studio-field mt-2 resize-none" />
        </label>
        <label class="block text-sm">
          <span class="text-xs uppercase tracking-[0.16em] text-zinc-500">连续性规则</span>
          <textarea v-model="form.continuityNotes" rows="3" class="studio-field mt-2 resize-none" />
        </label>
        <button type="submit" :disabled="store.saving" class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950">
          {{ store.saving ? "保存中…" : store.missingBible ? "创建故事圣经" : "保存" }}
        </button>
      </form>

      <WorldGenerationHistory :items="store.storyBibleGenerations" :type="GenerationTaskType.STORY_BIBLE" />
    </PageState>
  </section>
</template>

<script setup lang="ts">
import { emptyStoryBibleRules } from "@ai-drama-studio/core";
import { GenerationTaskType } from "@ai-drama-studio/types";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useStoryStore } from "~/stores/story";

const { projectId } = useCurrentProject();
const store = useStoryStore();
const form = reactive({
  title: "",
  logline: "",
  premise: "",
  theme: "",
  tone: "",
  style: "",
  audience: "",
  storyPromise: "",
  worldRules: "",
  characterRules: "",
  narrativeRules: "",
  forbidden: "",
  timelineSummary: "",
  continuityNotes: "",
});

function lines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function syncForm() {
  const bible = store.bible;
  const rules = bible?.rules ?? emptyStoryBibleRules();
  form.title = bible?.title || "";
  form.logline = bible?.logline || "";
  form.premise = bible?.premise || "";
  form.theme = bible?.theme || "";
  form.tone = bible?.tone || "";
  form.style = bible?.style || "";
  form.audience = bible?.audience || "";
  form.storyPromise = bible?.storyPromise || "";
  form.worldRules = rules.worldRules.join("\n");
  form.characterRules = rules.characterRules.join("\n");
  form.narrativeRules = rules.narrativeRules.join("\n");
  form.forbidden = rules.forbidden.join("\n");
  form.timelineSummary = bible?.timelineSummary || "";
  form.continuityNotes = bible?.continuityNotes || "";
}

watch(
  () => store.bible,
  () => syncForm(),
  { immediate: true },
);

onMounted(() => {
  void store.loadBible(projectId.value).then(syncForm);
});

async function onSave() {
  const payload = {
    title: form.title.trim() || "未命名作品",
    logline: form.logline,
    premise: form.premise,
    theme: form.theme,
    tone: form.tone,
    style: form.style,
    audience: form.audience,
    storyPromise: form.storyPromise,
    rules: {
      worldRules: lines(form.worldRules),
      characterRules: lines(form.characterRules),
      narrativeRules: lines(form.narrativeRules),
      forbidden: lines(form.forbidden),
    },
    timelineSummary: form.timelineSummary,
    continuityNotes: form.continuityNotes,
  };
  if (store.missingBible || !store.bible) {
    await store.createBible(projectId.value, payload);
  } else {
    await store.updateBible(projectId.value, payload);
  }
}
</script>
