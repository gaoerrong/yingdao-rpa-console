<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  totalText: string
  total?: number
  current?: number
  size?: number
  pageSizeOptions?: number[]
}>(), {
  total: 0,
  current: 1,
  size: 10,
  pageSizeOptions: () => [10, 50, 100],
})

const emit = defineEmits<{
  (e: 'update:current', value: number): void
  (e: 'update:size', value: number): void
}>()

const totalPages = computed(() => {
  if (!props.total || !props.size) return 1
  return Math.max(1, Math.ceil(props.total / props.size))
})

const pages = computed(() => {
  const values = new Set<number>([1, totalPages.value, props.current])
  for (let offset = -1; offset <= 1; offset++) {
    const page = props.current + offset
    if (page >= 1 && page <= totalPages.value) {
      values.add(page)
    }
  }
  return Array.from(values).sort((a, b) => a - b)
})

const displayItems = computed<(number | string)[]>(() => {
  const items: (number | string)[] = []
  let previous = 0
  for (const page of pages.value) {
    if (previous && page - previous > 1) {
      items.push('ellipsis-' + previous)
    }
    items.push(page)
    previous = page
  }
  return items
})

function updatePage(page: number) {
  if (page < 1 || page > totalPages.value || page === props.current) return
  emit('update:current', page)
}

function updateSize(event: Event) {
  const next = Number((event.target as HTMLSelectElement).value)
  if (!Number.isFinite(next) || next === props.size) return
  emit('update:size', next)
}
</script>

<template>
  <div class="pgn">
    <span class="pgni">{{ totalText }}</span>
    <label v-if="pageSizeOptions.length" class="pgsz">
      <span>每页</span>
      <select :value="size" @change="updateSize">
        <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}</option>
      </select>
      <span>条</span>
    </label>
    <button class="pgb" :disabled="current <= 1" @click="updatePage(current - 1)">
      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <path d="M6.5 2L3.5 5l3 3" />
      </svg>
    </button>
    <template v-for="item in displayItems" :key="item">
      <span v-if="typeof item === 'string'">...</span>
      <button v-else class="pgb" :class="{ cur: item === current }" @click="updatePage(item)">{{ item }}</button>
    </template>
    <button class="pgb" :disabled="current >= totalPages" @click="updatePage(current + 1)">
      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
        <path d="M3.5 2L6.5 5l-3 3" />
      </svg>
    </button>
  </div>
</template>
