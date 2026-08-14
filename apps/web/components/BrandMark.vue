<template>
  <span
    :class="[
      'inline-flex items-center justify-center rounded-md border border-gold-400/40 bg-gold-400/10 text-gold-400',
      small ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs',
    ]"
  >
    AD
  </span>
</template>

<script setup lang="ts">
defineProps<{
  small?: boolean;
}>();
</script>
