<script setup lang="ts">
const { theme } = useTheme()
useHead(() => ({
  htmlAttrs: { 'data-theme': theme.value },
  meta: [{ name: 'theme-color', content: theme.value === 'light' ? '#f4f7f5' : '#0a0e11' }],
}))
</script>
<template>
  <NuxtPage />
</template>
