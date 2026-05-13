<script setup lang="ts">
const props = defineProps<{
  label: string
  tone?: 'ok' | 'run' | 'err' | 'warn' | 'off' | 'dis' | 'hi' | 'mid' | 'lo' | 'sa' | 'ta' | 'mb' | 'en'
  blink?: boolean
}>()
</script>

<template>
  <span class="pill" :class="[`p-${props.tone || 'off'}`, props.blink && 'blink']">
    <span class="pdot"></span>
    {{ label }}
  </span>
</template>
