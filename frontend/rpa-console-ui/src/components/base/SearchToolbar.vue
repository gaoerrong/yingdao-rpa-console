<script setup lang="ts">
defineProps<{
  placeholder: string
}>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="toolbar">
    <div class="srch">
      <svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <circle cx="5.5" cy="5.5" r="4" />
        <path d="M9.5 9.5l2 2" />
      </svg>
      <input v-model="model" type="text" :placeholder="placeholder" />
    </div>
    <slot />
  </div>
</template>
