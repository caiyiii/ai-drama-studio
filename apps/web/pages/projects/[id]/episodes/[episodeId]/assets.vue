<template>
  <section class="px-4 py-6 tablet:px-8 desktop:px-8">
    <PageState
      :loading="loading"
      :error="error"
      loading-text="正在进入本集制作…"
      :on-retry="redirectIfNeeded"
    />
  </section>
</template>

<script setup lang="ts">
import { useEpisodeCanonicalRedirect } from "~/composables/useEpisodeCanonicalRedirect";

const { loading, error, redirectIfNeeded } = useEpisodeCanonicalRedirect("assets");
</script>
