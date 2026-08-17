<script setup lang="ts">
export interface BreadcrumbItem {
  label: string;
  to?: string;
}

const props = defineProps<{
  items: BreadcrumbItem[];
}>();

const router = useRouter();

const parent = computed(() => {
  const last = props.items[props.items.length - 1];
  const linked = props.items.filter((item) => item.to);
  if (last?.to) {
    return linked.length >= 2 ? linked[linked.length - 2] ?? null : null;
  }
  return linked[linked.length - 1] ?? null;
});

const canGoBack = computed(() => {
  if (typeof window === "undefined") {
    return Boolean(parent.value?.to);
  }
  return Boolean(window.history.state?.back) || Boolean(parent.value?.to);
});

function goBack() {
  if (typeof window !== "undefined" && window.history.state?.back) {
    router.back();
    return;
  }
  if (parent.value?.to) {
    void navigateTo(parent.value.to);
  }
}
</script>

<template>
  <nav class="flex min-w-0 items-center gap-2" aria-label="面包屑">
    <button
      v-if="canGoBack"
      type="button"
      class="shrink-0 rounded-lg px-1.5 py-1 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-gold-300"
      aria-label="返回上一级"
      @click="goBack"
    >
      ←
    </button>
    <ol class="flex min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap">
      <li
        v-for="(item, index) in items"
        :key="`${item.label}-${index}`"
        class="flex min-w-0 items-center gap-1"
      >
        <span v-if="index > 0" class="text-zinc-600">/</span>
        <NuxtLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="max-w-[10rem] truncate text-sm text-zinc-400 transition hover:text-gold-300"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else
          class="truncate"
          :class="
            index === items.length - 1
              ? 'max-w-[14rem] font-display text-lg text-zinc-100'
              : 'text-sm text-zinc-400'
          "
        >
          {{ item.label }}
        </span>
      </li>
    </ol>
  </nav>
</template>
