<script setup lang="ts">
import AppModal from './AppModal.vue'
import BaseButton from './BaseButton.vue'

defineProps<{
  open: boolean
  title: string
  step: number
  total: number
  canBack?: boolean
}>()

const emit = defineEmits<{
  close: []
  back: []
  next: []
}>()
</script>

<template>
  <AppModal :open="open" :title="title" large @close="emit('close')">
    <slot />
    <template #footer>
      <BaseButton v-if="canBack" @click="emit('back')">
        <svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <path d="M9 6.5H3M6 3.5L3 6.5l3 3" />
        </svg>
        上一步
      </BaseButton>
      <span class="flex-1"></span>
      <BaseButton @click="emit('close')">取消</BaseButton>
      <BaseButton variant="primary" @click="emit('next')">
        {{ step === total ? '保存任务' : '下一步' }}
        <svg viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <path d="M4 6.5h6M7 3.5l3 3-3 3" />
        </svg>
      </BaseButton>
    </template>
  </AppModal>
</template>
