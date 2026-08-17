<script setup lang="ts">
export interface StudioSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: StudioSelectOption[];
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    placeholder: "请选择",
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const open = ref(false);
const trigger = ref<HTMLElement | null>(null);
const panelStyle = ref<Record<string, string>>({});

const currentLabel = computed(() => {
  const match = props.options.find((item) => item.value === props.modelValue);
  return match?.label ?? props.placeholder;
});

const hasValue = computed(() =>
  props.options.some((item) => item.value === props.modelValue),
);

function placePanel() {
  const rect = trigger.value?.getBoundingClientRect();
  if (!rect) {
    return;
  }
  const maxHeight = 280;
  const spaceBelow = window.innerHeight - rect.bottom - 12;
  const openUp = spaceBelow < 160 && rect.top > spaceBelow;
  panelStyle.value = {
    position: "fixed",
    left: `${Math.round(rect.left)}px`,
    width: `${Math.round(rect.width)}px`,
    maxHeight: `${maxHeight}px`,
    ...(openUp
      ? { bottom: `${Math.round(window.innerHeight - rect.top + 8)}px` }
      : { top: `${Math.round(rect.bottom + 8)}px` }),
  };
}

function toggle() {
  if (props.disabled) {
    return;
  }
  open.value = !open.value;
  if (open.value) {
    nextTick(placePanel);
  }
}

function select(option: StudioSelectOption) {
  if (option.disabled) {
    return;
  }
  emit("update:modelValue", option.value);
  open.value = false;
}

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") {
    open.value = false;
  }
}

watch(open, (value) => {
  if (value) {
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    window.addEventListener("keydown", onKey);
  } else {
    window.removeEventListener("resize", placePanel);
    window.removeEventListener("scroll", placePanel, true);
    window.removeEventListener("keydown", onKey);
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", placePanel);
  window.removeEventListener("scroll", placePanel, true);
  window.removeEventListener("keydown", onKey);
});
</script>

<template>
  <div class="relative">
    <button
      ref="trigger"
      type="button"
      :disabled="disabled"
      class="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900 px-4 py-3 text-left text-sm outline-none ring-gold-400/40 transition hover:border-gold-400/30 focus:ring-2 disabled:opacity-40"
      :class="hasValue ? 'text-zinc-100' : 'text-zinc-500'"
      @click="toggle"
    >
      <span class="min-w-0 truncate">{{ currentLabel }}</span>
      <span class="text-[10px] text-gold-400/80" :class="open ? 'rotate-180' : ''">▾</span>
    </button>
    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-[90]" @click="open = false">
        <ul
          class="overflow-y-auto rounded-xl border border-white/10 bg-ink-800 py-1 shadow-2xl shadow-black/50"
          :style="panelStyle"
          @click.stop
        >
          <li v-for="option in options" :key="option.value">
            <button
              type="button"
              :disabled="option.disabled"
              class="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition"
              :class="[
                option.disabled
                  ? 'cursor-not-allowed text-zinc-600'
                  : 'text-zinc-200 hover:bg-white/5 hover:text-gold-300',
                option.value === modelValue ? 'bg-gold-400/10 text-gold-300' : '',
              ]"
              @click="select(option)"
            >
              <span>{{ option.label }}</span>
              <span v-if="option.value === modelValue" class="text-gold-400">✓</span>
            </button>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>
