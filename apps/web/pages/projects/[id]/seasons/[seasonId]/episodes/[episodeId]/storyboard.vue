<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="store.loading || story.loading"
      :error="store.error || story.error"
      loading-text="正在载入分镜…"
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
            <p class="mt-1 text-sm text-zinc-400">分镜</p>
            <p class="mt-2 text-sm text-zinc-500">
              把确认后的剧本拆解成具体镜头。
              {{ store.storyboard ? statusLabel(store.storyboard.status) : "本集尚未生成分镜。" }}
              <span v-if="store.storyboard"> · v{{ store.storyboard.version }}</span>
              <span v-if="store.storyboard"> · {{ store.totalDuration }}s</span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <NuxtLink
              :to="pathFor('workspace')"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
            >
              返回本集工作台
            </NuxtLink>
            <NuxtLink
              :to="pathFor('storyboard')"
              class="rounded-xl border border-gold-400/30 px-3 py-1.5 text-sm text-gold-300"
            >
              继续生成画面
            </NuxtLink>
            <StoryboardGenerateModal
              :project-id="projectId"
              :episode-id="episodeId"
              :has-existing-storyboard="Boolean(store.storyboard && store.shots.length > 0)"
              @applied="reload"
            />
            <button
              v-if="store.missing"
              type="button"
              class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
              @click="onCreateBlank"
            >
              创建空白分镜
            </button>
            <button
              v-if="store.storyboard && !store.locked && store.storyboard.status !== StoryboardStatus.READY"
              type="button"
              class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
              @click="onConfirm"
            >
              确认分镜
            </button>
            <NuxtLink
              v-if="store.storyboard && (store.storyboard.status === StoryboardStatus.READY || store.locked)"
              :to="pathFor('assets')"
              class="rounded-xl bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950"
            >
              生成视觉素材
            </NuxtLink>
            <button
              v-if="store.storyboard && !store.locked"
              type="button"
              class="rounded-xl border border-amber-400/30 px-3 py-1.5 text-sm text-amber-200"
              @click="confirmLock = true"
            >
              锁定
            </button>
            <button
              v-if="store.locked"
              type="button"
              class="rounded-xl border border-white/10 px-3 py-1.5 text-sm"
              @click="onUnlock"
            >
              解锁
            </button>
          </div>
        </div>

        <EpisodeProductionNav
          :project-id="projectId"
          :episode-id="episodeId"
          :season-id="seasonId"
          current="storyboard"
        />

        <p
          v-if="store.storyboard?.stale"
          class="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
        >
          剧本已更新，当前分镜可能已过期。建议重新生成或核对镜头与 ScriptBlock 的对应关系。
        </p>
        <div
          v-if="script.missing"
          class="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
        >
          生成分镜前，需要先完成剧本。
          <NuxtLink :to="pathFor('script')" class="ml-2 text-gold-300">
            先去完成剧本
          </NuxtLink>
        </div>
        <div
          v-else-if="!scriptReady"
          class="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200"
        >
          剧本还未进入 READY / LOCKED 状态，暂时不能生成分镜。
          <NuxtLink :to="pathFor('script')" class="ml-2 text-gold-300">
            先去确认剧本
          </NuxtLink>
        </div>
        <p v-if="store.actionError" class="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {{ store.actionError }}
        </p>

        <div v-if="store.storyboard" class="grid gap-4 desktop:grid-cols-[200px_1fr_280px]">
          <aside class="rounded-2xl border border-white/5 bg-ink-800/60 p-3">
            <p class="mb-3 text-xs uppercase tracking-[0.16em] text-zinc-500">Scenes</p>
            <button
              type="button"
              class="mb-2 block w-full rounded-xl border px-3 py-2 text-left text-sm"
              :class="!store.selectedSceneId ? 'border-gold-400/40 bg-gold-400/10' : 'border-white/5'"
              @click="store.selectedSceneId = null"
            >
              全部镜头
            </button>
            <button
              v-for="scene in script.scenes"
              :key="scene.id"
              type="button"
              class="mb-2 block w-full rounded-xl border px-3 py-2 text-left text-sm"
              :class="scene.id === store.selectedSceneId ? 'border-gold-400/40 bg-gold-400/10' : 'border-white/5'"
              @click="selectScene(scene.id)"
            >
              Scene {{ String(scene.number).padStart(2, "0") }}
              <span class="mt-1 block text-zinc-400">{{ scene.title }}</span>
            </button>
          </aside>

          <article class="rounded-2xl border border-white/5 bg-ink-800/60 p-4">
            <div class="mb-4 flex items-center justify-between">
              <p class="text-xs uppercase tracking-[0.16em] text-zinc-500">Shot Timeline</p>
              <button v-if="!store.locked" type="button" class="text-xs text-gold-300" @click="onAddShot">
                新增镜头
              </button>
            </div>
            <div class="flex gap-3 overflow-x-auto pb-2">
              <button
                v-for="shot in store.visibleShots"
                :key="shot.id"
                type="button"
                class="min-w-[160px] rounded-2xl border px-3 py-3 text-left"
                :class="shot.id === store.selectedShot?.id ? 'border-gold-400/50 bg-gold-400/10' : 'border-white/10 bg-ink-950/40'"
                draggable="true"
                @click="store.selectedShotId = shot.id"
                @dragstart="dragShotId = shot.id"
                @dragover.prevent
                @drop="onDropShot(shot.id)"
              >
                <p class="text-xs text-gold-300">Shot {{ String(shot.shotNumber).padStart(3, "0") }}</p>
                <p class="mt-1 text-sm">{{ sizeLabel(shot.shotSize) }}</p>
                <p class="mt-1 text-xs text-zinc-500">{{ shot.durationSeconds }}s · {{ movementLabel(shot.cameraMovement) }}</p>
                <p class="mt-1 text-[11px]" :class="shotImageTone(shot)">{{ shotImageLabel(shot) }}</p>
                <p class="mt-1 text-[11px]" :class="shotVideoTone(shot)">🎬 {{ shotVideoLabel(shot) }}</p>
                <p class="mt-2 line-clamp-3 text-xs text-zinc-400">{{ shot.visualDescription }}</p>
              </button>
            </div>
            <p v-if="store.visibleShots.length === 0" class="text-sm text-zinc-500">还没有镜头。可以用 AI 生成整集，或手动新增。</p>
          </article>

          <aside class="rounded-2xl border border-white/5 bg-ink-800/60 p-4 text-sm">
            <p class="text-xs uppercase tracking-[0.16em] text-gold-400/80">Shot Inspector</p>
            <div v-if="store.selectedShot" class="mt-3 space-y-3">
              <p class="text-zinc-400">
                镜头 {{ store.selectedShot.shotNumber }}
                ·
                <NuxtLink class="text-gold-300" :to="pathFor('script')">
                  {{ sceneLabel(store.selectedShot.sceneId) }}
                </NuxtLink>
                · {{ blockLabel(store.selectedShot.scriptBlockId) }}
              </p>
              <select v-model="inspector.shotType" class="studio-field" :disabled="store.locked" @change="onSaveShot">
                <option v-for="item in shotTypes" :key="item" :value="item">{{ typeLabel(item) }}</option>
              </select>
              <select v-model="inspector.shotSize" class="studio-field" :disabled="store.locked" @change="onSaveShot">
                <option v-for="item in shotSizes" :key="item" :value="item">{{ sizeLabel(item) }}</option>
              </select>
              <select v-model="inspector.cameraMovement" class="studio-field" :disabled="store.locked" @change="onSaveShot">
                <option v-for="item in movements" :key="item" :value="item">{{ movementLabel(item) }}</option>
              </select>
              <select v-model="inspector.cameraAngle" class="studio-field" :disabled="store.locked" @change="onSaveShot">
                <option v-for="item in angles" :key="item" :value="item">{{ angleLabel(item) }}</option>
              </select>
              <select v-model="inspector.transition" class="studio-field" :disabled="store.locked" @change="onSaveShot">
                <option v-for="item in transitions" :key="item" :value="item">{{ transitionLabel(item) }}</option>
              </select>
              <input v-model.number="inspector.durationSeconds" type="number" min="1" class="studio-field" :disabled="store.locked" @change="onSaveShot" />
              <textarea v-model="inspector.composition" rows="2" class="studio-field resize-none" placeholder="构图" :disabled="store.locked" @change="onSaveShot" />
              <textarea v-model="inspector.visualDescription" rows="3" class="studio-field resize-none" placeholder="视觉描述" :disabled="store.locked" @change="onSaveShot" />
              <textarea v-model="inspector.action" rows="2" class="studio-field resize-none" placeholder="动作" :disabled="store.locked" @change="onSaveShot" />
              <textarea v-model="inspector.dialogue" rows="2" class="studio-field resize-none" placeholder="对白" :disabled="store.locked" @change="onSaveShot" />
              <textarea v-model="inspector.narration" rows="2" class="studio-field resize-none" placeholder="旁白" :disabled="store.locked" @change="onSaveShot" />
              <input v-model="inspector.location" class="studio-field" placeholder="地点" :disabled="store.locked" @change="onSaveShot" />
              <input v-model="inspector.lighting" class="studio-field" placeholder="灯光" :disabled="store.locked" @change="onSaveShot" />
              <input v-model="inspector.mood" class="studio-field" placeholder="情绪" :disabled="store.locked" @change="onSaveShot" />
              <input v-model="inspector.visualStyle" class="studio-field" placeholder="视觉风格" :disabled="store.locked" @change="onSaveShot" />
              <textarea v-model="inspector.imagePrompt" rows="2" class="studio-field resize-none" placeholder="Image Prompt" :disabled="store.locked" @change="onSaveShot" />
              <ShotImagePanel
                v-if="store.selectedShot"
                :project-id="projectId"
                :episode-id="episodeId"
                :shot="store.selectedShot"
                :image-configured="imageConfigured"
                :storyboard-stale="store.storyboard?.stale"
              />
              <ShotVideoPanel
                v-if="store.selectedShot"
                :project-id="projectId"
                :episode-id="episodeId"
                :shot="store.selectedShot"
                :video-configured="videoConfigured"
                :image-to-video-configured="imageToVideoConfigured"
                :storyboard-version="store.storyboard?.version"
              />
              <textarea v-model="inspector.videoPrompt" rows="2" class="studio-field resize-none" placeholder="Video Prompt" :disabled="store.locked" @change="onSaveShot" />
              <textarea v-model="inspector.negativePrompt" rows="2" class="studio-field resize-none" placeholder="Negative Prompt" :disabled="store.locked" @change="onSaveShot" />
              <textarea v-model="inspector.continuityNotes" rows="2" class="studio-field resize-none" placeholder="连续性备注" :disabled="store.locked" @change="onSaveShot" />
              <p class="text-xs text-zinc-500">人物：{{ characterNames(store.selectedShot.characterIds) }}</p>
              <button
                v-if="!store.locked"
                type="button"
                class="text-xs text-red-300"
                @click="onDeleteShot"
              >
                删除镜头
              </button>
            </div>
            <p v-else class="mt-3 text-zinc-500">选择一个镜头查看详情。</p>
            <WorldGenerationHistory class="mt-6" :items="store.videoGenerations" />
            <WorldGenerationHistory class="mt-6" :items="store.imageGenerations" :type="GenerationTaskType.IMAGE" />
            <WorldGenerationHistory class="mt-6" :items="store.storyboardGenerations" :type="GenerationTaskType.STORYBOARD" />
          </aside>
        </div>
      </div>
    </PageState>

    <ConfirmDialog
      :open="confirmLock"
      title="锁定分镜？"
      message="锁定后本阶段将无法继续编辑镜头。"
      confirm-label="确认锁定"
      @confirm="onLock"
      @cancel="confirmLock = false"
    />
  </section>
</template>

<script setup lang="ts">
import {
  getCameraAngleLabel,
  getCameraMovementLabel,
  filterShotAssetsByMediaType,
  getPrimaryShotAsset,
  getShotImageStatus,
  getShotImageStatusLabel,
  getShotVideoStatus,
  getShotVideoStatusLabel,
  isShotVideoStale,
  getStoryboardShotSizeLabel,
  getStoryboardShotTypeLabel,
  getStoryboardStatusLabel,
  getStoryboardTransitionLabel,
} from "@ai-drama-studio/core";
import {
  AssetType,
  CameraAngle,
  CameraMovement,
  GenerationTaskStatus,
  GenerationTaskType,
  ScriptStatus,
  StoryboardShotSize,
  StoryboardShotType,
  StoryboardStatus,
  StoryboardTransition,
  type StoryboardShot,
  type StoryboardStatus as StoryboardStatusType,
} from "@ai-drama-studio/types";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "#imports";
import { useEpisodeProductionPaths } from "~/composables/useEpisodeProduction";
import { useCurrentProject } from "~/composables/useCurrentProject";
import { useAiProviderStore } from "~/stores/ai-provider";
import { useCharacterStore } from "~/stores/character";
import { useScriptStore } from "~/stores/script";
import { useStoryboardStore } from "~/stores/storyboard";
import { useStoryStore } from "~/stores/story";

const route = useRoute();
const { pathFor, seasonId } = useEpisodeProductionPaths();
const { projectId } = useCurrentProject();
const episodeId = computed(() => String(route.params.episodeId));
const store = useStoryboardStore();
const script = useScriptStore();
const story = useStoryStore();
const characters = useCharacterStore();
const aiStore = useAiProviderStore();
const confirmLock = ref(false);
const dragShotId = ref<string | null>(null);

const shotTypes = Object.values(StoryboardShotType);
const shotSizes = Object.values(StoryboardShotSize);
const movements = Object.values(CameraMovement);
const angles = Object.values(CameraAngle);
const transitions = Object.values(StoryboardTransition);

const inspector = reactive({
  shotType: StoryboardShotType.WIDE,
  shotSize: StoryboardShotSize.WIDE,
  cameraMovement: CameraMovement.STATIC,
  cameraAngle: CameraAngle.EYE_LEVEL,
  transition: StoryboardTransition.CUT,
  durationSeconds: 4,
  composition: "",
  visualDescription: "",
  action: "",
  dialogue: "",
  narration: "",
  location: "",
  lighting: "",
  mood: "",
  visualStyle: "",
  imagePrompt: "",
  videoPrompt: "",
  negativePrompt: "",
  continuityNotes: "",
});

const episode = computed(
  () => story.projectEpisodes.find((item) => item.id === episodeId.value) ?? story.episode,
);
const episodeLabel = computed(() => {
  const current = episode.value;
  return current
    ? `E${String(current.number).padStart(2, "0")} · ${current.title}`
    : "本集分镜";
});
const episodeHeading = computed(() => episodeLabel.value);
const scriptReady = computed(
  () =>
    Boolean(script.script) &&
    (script.script?.status === ScriptStatus.READY ||
      script.script?.status === ScriptStatus.LOCKED),
);

const imageConfigured = computed(
  () => Boolean(aiStore.projectAiConfig?.IMAGE?.configured),
);
const videoConfigured = computed(
  () => Boolean(aiStore.projectAiConfig?.VIDEO?.configured),
);
const imageToVideoConfigured = computed(
  () => Boolean(aiStore.projectAiConfig?.IMAGE_TO_VIDEO?.configured),
);

function shotImageLabel(shot: StoryboardShot) {
  return getShotImageStatusLabel(shotImageStatus(shot));
}

function shotImageStatus(shot: StoryboardShot) {
  const generating = store.imageGeneratingShotId === shot.id;
  const preview = store.previewByShotId[shot.id];
  const hasUnappliedPreview =
    preview?.status === GenerationTaskStatus.SUCCEEDED && !preview.appliedAt;
  return getShotImageStatus({
    assets: filterShotAssetsByMediaType(shot.assets, AssetType.IMAGE),
    generating,
    hasUnappliedPreview,
    storyboardStale: store.storyboard?.stale,
  });
}

function shotVideoLabel(shot: StoryboardShot) {
  return getShotVideoStatusLabel(shotVideoStatus(shot));
}

function shotVideoStatus(shot: StoryboardShot) {
  const generating = store.videoGeneratingShotId === shot.id;
  const preview = store.videoPreviewByShotId[shot.id];
  const hasUnappliedPreview =
    preview?.status === GenerationTaskStatus.SUCCEEDED && !preview.appliedAt;
  const primary = getPrimaryShotAsset(shot.assets, AssetType.VIDEO)?.asset;
  const stale = isShotVideoStale({
    storyboardVersion: store.storyboard?.version,
    generatedFromStoryboardVersion:
      typeof primary?.metadata?.storyboardVersion === "number"
        ? primary.metadata.storyboardVersion
        : null,
    shotUpdatedAt: shot.updatedAt,
    videoCreatedAt: primary?.createdAt,
  });
  return getShotVideoStatus({
    assets: shot.assets,
    generating,
    hasUnappliedPreview,
    stale,
  });
}

function shotVideoTone(shot: StoryboardShot) {
  const status = shotVideoStatus(shot);
  if (status === "READY") return "text-emerald-300";
  if (status === "GENERATING") return "text-gold-300";
  if (status === "CANDIDATE") return "text-sky-300";
  if (status === "STALE") return "text-amber-200";
  return "text-zinc-500";
}

function shotImageTone(shot: StoryboardShot) {
  const status = shotImageStatus(shot);
  if (status === "READY") return "text-emerald-300";
  if (status === "GENERATING") return "text-gold-300";
  if (status === "CANDIDATE") return "text-sky-300";
  if (status === "STALE") return "text-amber-200";
  return "text-zinc-500";
}

function statusLabel(status: StoryboardStatusType) {
  return getStoryboardStatusLabel(status);
}
function typeLabel(value: StoryboardShotType) {
  return getStoryboardShotTypeLabel(value);
}
function sizeLabel(value: StoryboardShotSize) {
  return getStoryboardShotSizeLabel(value);
}
function movementLabel(value: CameraMovement) {
  return getCameraMovementLabel(value);
}
function angleLabel(value: CameraAngle) {
  return getCameraAngleLabel(value);
}
function transitionLabel(value: StoryboardTransition) {
  return getStoryboardTransitionLabel(value);
}

function sceneLabel(sceneId: string | null) {
  const scene = script.scenes.find((item) => item.id === sceneId);
  return scene ? `Scene ${String(scene.number).padStart(2, "0")}` : "未关联场景";
}

function blockLabel(blockId: string | null) {
  for (const scene of script.scenes) {
    const block = scene.blocks?.find((item) => item.id === blockId);
    if (block) {
      return `ScriptBlock #${block.order}`;
    }
  }
  return "未关联段落";
}

function characterNames(ids: string[]) {
  return (
    ids
      .map((id) => characters.characters.find((item) => item.id === id)?.name)
      .filter(Boolean)
      .join("、") || "无"
  );
}

function selectScene(sceneId: string) {
  store.selectedSceneId = sceneId;
  store.selectedShotId = store.visibleShots[0]?.id ?? null;
}

function syncInspector() {
  const shot = store.selectedShot;
  if (!shot) {
    return;
  }
  inspector.shotType = shot.shotType;
  inspector.shotSize = shot.shotSize;
  inspector.cameraMovement = shot.cameraMovement;
  inspector.cameraAngle = shot.cameraAngle;
  inspector.transition = shot.transition;
  inspector.durationSeconds = shot.durationSeconds;
  inspector.composition = shot.composition || "";
  inspector.visualDescription = shot.visualDescription;
  inspector.action = shot.action || "";
  inspector.dialogue = shot.dialogue || "";
  inspector.narration = shot.narration || "";
  inspector.location = shot.location || "";
  inspector.lighting = shot.lighting || "";
  inspector.mood = shot.mood || "";
  inspector.visualStyle = shot.visualStyle || "";
  inspector.imagePrompt = shot.imagePrompt || "";
  inspector.videoPrompt = shot.videoPrompt || "";
  inspector.negativePrompt = shot.negativePrompt || "";
  inspector.continuityNotes = shot.continuityNotes || "";
}

async function reload() {
  await Promise.all([
    store.load(projectId.value, episodeId.value),
    script.load(projectId.value, episodeId.value),
    story.loadProjectEpisodes(projectId.value),
    characters.load(projectId.value),
    aiStore.loadProjectAiConfig(projectId.value),
    aiStore.loadCapabilities(),
  ]);
  syncInspector();
}

watch(
  () => store.selectedShot?.id,
  () => syncInspector(),
);

onMounted(() => {
  void reload();
});

async function onCreateBlank() {
  await store.create(projectId.value, episodeId.value, {
    title: `${episode.value?.title || "未命名"} · 分镜`,
  });
  await reload();
}

async function onConfirm() {
  await store.update(projectId.value, episodeId.value, { status: StoryboardStatus.READY });
}

async function onLock() {
  confirmLock.value = false;
  await store.update(projectId.value, episodeId.value, { status: StoryboardStatus.LOCKED });
}

async function onUnlock() {
  await store.update(projectId.value, episodeId.value, { status: StoryboardStatus.READY });
}

async function onSaveShot() {
  if (!store.selectedShot) {
    return;
  }
  await store.updateShot(projectId.value, episodeId.value, store.selectedShot.id, {
    ...inspector,
  });
}

async function onAddShot() {
  const scene = script.selectedScene ?? script.scenes[0];
  const block = scene?.blocks?.[0];
  if (!scene) {
    store.actionError = "请先在剧本中创建场景";
    return;
  }
  const shotNumber = (store.shots[store.shots.length - 1]?.shotNumber ?? 0) + 1;
  await store.createShot(projectId.value, episodeId.value, {
    shotNumber,
    sceneId: scene.id,
    scriptBlockId: block?.id,
    shotType: StoryboardShotType.MEDIUM,
    shotSize: StoryboardShotSize.MEDIUM,
    cameraMovement: CameraMovement.STATIC,
    cameraAngle: CameraAngle.EYE_LEVEL,
    visualDescription: "新镜头，请补充视觉描述。",
    durationSeconds: 3,
    characterIds: block?.characterId ? [block.characterId] : [],
  });
}

async function onDeleteShot() {
  if (!store.selectedShot) {
    return;
  }
  await store.removeShot(projectId.value, episodeId.value, store.selectedShot.id);
}

async function onDropShot(targetId: string) {
  if (!dragShotId.value || dragShotId.value === targetId) {
    return;
  }
  const ids = store.shots.map((item) => item.id);
  const from = ids.indexOf(dragShotId.value);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0) {
    return;
  }
  ids.splice(from, 1);
  ids.splice(to, 0, dragShotId.value);
  await store.reorder(projectId.value, episodeId.value, ids);
  dragShotId.value = null;
}
</script>
