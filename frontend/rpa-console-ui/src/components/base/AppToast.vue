<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const { visible, message, type } = storeToRefs(toast)
</script>

<template>
  <Teleport to="body">
    <div class="toast" :class="[visible && 'show', type]">{{ message }}</div>
  </Teleport>
</template>
