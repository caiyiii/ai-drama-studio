<template>
  <div class="space-y-4">
    <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-950">
      <div class="flex aspect-video items-center justify-center bg-black">
        <video
          v-if="visual?.type === 'VIDEO' && visualSrc"
          ref="videoEl"
          :src="visualSrc"
          class="h-full w-full object-contain"
          muted
          playsinline
        />
        <img
          v-else-if="visual?.type === 'IMAGE' && visualSrc"
          :src="visualSrc"
          alt="当前镜头"
          class="h-full w-full object-contain"
        />
        <div v-else class="px-6 text-center text-sm text-zinc-500">
          {{ placeholderLabel }}
        </div>
      </div>
    </div>
    <div class="space-y-2">
      <input
        type="range"
        min="0"
        :max="duration"
        step="0.05"
        :value="currentTime"
        class="w-full accent-gold-400"
        @input="onSeek"
      />
      <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div class="flex gap-2">
          <button type="button" class="rounded-xl bg-gold-400 px-4 py-1.5 font-medium text-ink-950" @click="toggle">
            {{ playing ? "暂停" : "播放" }}
          </button>
          <button type="button" class="rounded-xl border border-white/10 px-3 py-1.5" @click="stop">
            复位
          </button>
        </div>
        <p class="font-mono text-xs text-zinc-400">
          {{ formatClock(currentTime) }} / {{ formatClock(duration) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  clipCoversTime,
  resolveActiveVisualClip,
  resolveAssetDisplayUrl,
} from "@ai-drama-studio/core";
import type { CompositionClip, CompositionManifest } from "@ai-drama-studio/types";

const props = defineProps<{
  manifest: CompositionManifest;
  apiBase: string;
}>();

const currentTime = ref(0);
const playing = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
const audioNodes = new Map<string, HTMLAudioElement>();
let raf = 0;
let lastStamp = 0;

const duration = computed(() => Math.max(props.manifest.durationSeconds, 0.001));

const allClips = computed(() =>
  props.manifest.tracks.flatMap((track) => (track.enabled === false ? [] : track.clips)),
);

const visual = computed(() =>
  resolveActiveVisualClip(
    allClips.value.filter((clip) => clip.type === "VIDEO" || clip.type === "IMAGE"),
    currentTime.value,
  ),
);

const visualSrc = computed(() =>
  visual.value ? resolveAssetDisplayUrl(props.apiBase, visual.value.asset?.url) : null,
);

const placeholderLabel = computed(() => "Shot — Missing Visual");

function formatClock(value: number) {
  const total = Math.max(0, Math.floor(value));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function clipSrc(clip: CompositionClip) {
  return resolveAssetDisplayUrl(props.apiBase, clip.asset?.url);
}

function ensureAudio(clip: CompositionClip) {
  const src = clipSrc(clip);
  if (!src) {
    return null;
  }
  let node = audioNodes.get(clip.id);
  if (!node) {
    node = new Audio(src);
    node.preload = "auto";
    audioNodes.set(clip.id, node);
  }
  return node;
}

function syncMedia() {
  const time = currentTime.value;
  if (visual.value?.type === "VIDEO" && videoEl.value) {
    const offset =
      visual.value.sourceStartTime +
      (time - visual.value.startTime) * (visual.value.speed || 1);
    if (Math.abs(videoEl.value.currentTime - offset) > 0.3) {
      videoEl.value.currentTime = Math.max(0, offset);
    }
    if (playing.value) {
      void videoEl.value.play().catch(() => undefined);
    } else {
      videoEl.value.pause();
    }
  } else if (videoEl.value) {
    videoEl.value.pause();
  }

  for (const clip of allClips.value) {
    if (clip.type !== "AUDIO") {
      continue;
    }
    const node = ensureAudio(clip);
    if (!node) {
      continue;
    }
    const active = clipCoversTime(clip, time) && clip.playbackVolume > 0;
    node.volume = clip.playbackVolume;
    if (!active) {
      if (!node.paused) {
        node.pause();
      }
      continue;
    }
    const offset = clip.sourceStartTime + (time - clip.startTime) * (clip.speed || 1);
    if (Math.abs(node.currentTime - offset) > 0.35) {
      node.currentTime = Math.max(0, offset);
    }
    if (playing.value && node.paused) {
      void node.play().catch(() => undefined);
    }
    if (!playing.value && !node.paused) {
      node.pause();
    }
  }
}

function tick(stamp: number) {
  if (!playing.value) {
    return;
  }
  const delta = lastStamp ? (stamp - lastStamp) / 1000 : 0;
  lastStamp = stamp;
  currentTime.value = Math.min(duration.value, currentTime.value + delta);
  if (currentTime.value >= duration.value) {
    playing.value = false;
    currentTime.value = duration.value;
    pauseAll();
    return;
  }
  syncMedia();
  raf = requestAnimationFrame(tick);
}

function toggle() {
  playing.value = !playing.value;
  if (playing.value) {
    lastStamp = 0;
    raf = requestAnimationFrame(tick);
    syncMedia();
  } else {
    cancelAnimationFrame(raf);
    pauseAll();
  }
}

function stop() {
  playing.value = false;
  cancelAnimationFrame(raf);
  currentTime.value = 0;
  pauseAll();
  syncMedia();
}

function onSeek(event: Event) {
  const target = event.target as HTMLInputElement;
  currentTime.value = Number(target.value);
  syncMedia();
}

function pauseAll() {
  videoEl.value?.pause();
  for (const node of audioNodes.values()) {
    node.pause();
  }
}

watch(
  () => props.manifest.timelineId,
  () => {
    stop();
    for (const node of audioNodes.values()) {
      node.src = "";
    }
    audioNodes.clear();
  },
);

onUnmounted(() => {
  cancelAnimationFrame(raf);
  pauseAll();
  audioNodes.clear();
});
</script>
