<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'accent' | 'ghost'
    size?: 'sm' | 'md'
    loading?: boolean
    /** 与 loading 合并为原生 disabled；勿依赖 attribute 透传，否则会与 loading 合并异常 */
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    loading: false,
    disabled: false,
    type: 'button',
  },
)
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[
      variant === 'primary' && 'btn-pri',
      variant === 'secondary' && 'btn-sec',
      variant === 'accent' && 'btn-acc',
      variant === 'ghost' && 'btn-ghost',
      size === 'sm' && 'btn-sm',
      loading && 'syncing',
    ]"
    :disabled="loading || disabled"
  >
    <span v-if="loading" class="spin"></span>
    <slot />
  </button>
</template>
