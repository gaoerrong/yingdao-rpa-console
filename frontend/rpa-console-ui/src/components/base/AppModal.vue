<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  large?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="modal-shell" :class="{ open }" @click.self="emit('close')">
    <section class="modal" :class="{ 'modal-lg': large }">
      <div class="mhdr">
        <span class="mtitle">{{ title }}</span>
        <button class="mclose" @click="emit('close')">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>
      <div class="mbody">
        <slot />
      </div>
      <div class="mfoot">
        <slot name="footer" />
      </div>
    </section>
  </div>
</template>
