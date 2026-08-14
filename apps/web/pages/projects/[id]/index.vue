<template>
  <section class="mx-auto max-w-5xl px-4 py-6 tablet:px-8 desktop:px-10 desktop:py-8">
    <PageState
      :loading="loading && !project"
      :error="error"
      :empty="!loading && !error && !project"
      loading-text="正在载入项目工作台…"
      empty-title="未找到该项目"
      empty-action-label="返回项目列表"
      :on-retry="() => ensureProject()"
      :on-empty-action="() => navigateTo('/projects')"
    >
      <div v-if="project" class="space-y-8">
        <div class="overflow-hidden rounded-3xl border border-white/5 bg-ink-800/60">
          <ProjectCover
            :name="project.name"
            :cover="project.cover"
            :genre="project.genre"
          />
          <div class="space-y-4 p-6">
            <div class="flex flex-wrap items-center gap-3">
              <StatusBadge :status="project.status" />
              <span class="text-xs text-zinc-500">{{ project.genre || "未分类" }}</span>
            </div>
            <h1 class="font-display text-4xl text-zinc-100 tablet:text-5xl">{{ project.name }}</h1>
            <p class="max-w-2xl text-sm leading-6 text-zinc-500">
              {{ project.description || "尚未填写简介。可在设置中补充故事基调。" }}
            </p>
            <ProjectProgress :percent="progress" />
            <div class="flex flex-col gap-2 tablet:flex-row">
              <button
                type="button"
                class="rounded-xl bg-gold-400 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-gold-300"
                @click="onContinue"
              >
                继续制作
              </button>
              <NuxtLink
                to="/projects"
                class="rounded-xl border border-white/10 px-4 py-2 text-center text-sm text-zinc-300 hover:border-gold-400/40"
              >
                返回项目
              </NuxtLink>
            </div>
          </div>
        </div>

        <div>
          <p class="text-[11px] uppercase tracking-[0.2em] text-gold-400/80">创作流程</p>
          <h2 class="mt-2 font-display text-2xl">从世界观到成片</h2>
          <ol class="mt-5 grid gap-3 tablet:grid-cols-2">
            <li v-for="(item, index) in productionSteps" :key="item.step">
              <NuxtLink
                :to="getWorkspacePath(project.id, item.path)"
                class="flex items-center justify-between rounded-2xl border border-white/5 bg-ink-800/60 px-4 py-4 transition hover:border-gold-400/30"
              >
                <div>
                  <p class="text-[11px] text-zinc-500">{{ String(index + 1).padStart(2, "0") }}</p>
                  <p class="mt-1 text-sm text-zinc-100">{{ item.label }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs" :class="stateClass(item.step)">
                    {{ stateLabel(item.step) }}
                  </p>
                  <p class="mt-1 text-[11px] text-zinc-500">{{ stepPercent(item.step) }}%</p>
                </div>
              </NuxtLink>
            </li>
          </ol>
        </div>
      </div>
    </PageState>
  </section>
</template>

<script setup lang="ts">
import {
  getContinueProductionPath,
  getProductionNavItems,
  getProductionStepState,
  getProductionStepStateLabel,
  getProjectProgressPercent,
  getStepProgressPercent,
  getWorkspacePath,
} from "@ai-drama-studio/core";

const { project, loading, error, ensureProject } = useCurrentProject();
const productionSteps = getProductionNavItems();

const progress = computed(() =>
  project.value
    ? getProjectProgressPercent(project.value.status, project.value.currentStep)
    : 0,
);

function stateLabel(step: (typeof productionSteps)[number]["step"]) {
  if (!project.value) {
    return "";
  }
  return getProductionStepStateLabel(getProductionStepState(project.value, step));
}

function stateClass(step: (typeof productionSteps)[number]["step"]) {
  if (!project.value) {
    return "text-zinc-500";
  }
  const state = getProductionStepState(project.value, step);
  if (state === "current") {
    return "text-gold-300";
  }
  if (state === "done") {
    return "text-emerald-300";
  }
  return "text-zinc-500";
}

function stepPercent(step: (typeof productionSteps)[number]["step"]) {
  return getStepProgressPercent(step);
}

function onContinue() {
  if (!project.value) {
    return;
  }
  void navigateTo(
    getContinueProductionPath(project.value.id, project.value.currentStep),
  );
}
</script>
