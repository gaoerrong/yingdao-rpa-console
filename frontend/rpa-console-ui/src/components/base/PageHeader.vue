<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
}>()
</script>

<template>
  <div class="pghdr">
    <div class="pgtw">
      <div class="pgtitle">{{ title }}</div>
      <div class="pgsub">{{ subtitle }}</div>
    </div>
    <div class="pgacts">
      <slot />
    </div>
  </div>
</template>
