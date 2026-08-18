<script setup lang="ts">
const route = useRoute();
await navigateTo(`/projects/${route.params.id}/voices`, { redirectCode: 301 });
</script>
