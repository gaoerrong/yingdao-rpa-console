<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <!-- Teleport 到 body，避免 .app-shell / .page 的 overflow、层叠上下文导致无法点击下拉或选不中 -->
  <Teleport to="body">
    <div class="drawer-ov" :class="{ open }" @click="emit('close')"></div>
    <aside class="drawer" :class="{ open }" @click.stop>
      <div class="drwhdr">
        <slot name="badge" />
        <span class="drwtitle">{{ title }}</span>
        <button class="drwclose" @click="emit('close')">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>
      <div class="drwbody">
        <slot />
      </div>
      <div class="drwfoot">
        <slot name="footer" />
      </div>
    </aside>
  </Teleport>
</template>
