import { defineStore } from 'pinia'

type ToastType = '' | 'ok' | 'err'

export const useToastStore = defineStore('toast', {
  state: () => ({
    visible: false,
    message: '',
    type: '' as ToastType,
    timer: 0,
  }),
  actions: {
    show(message: string, type: ToastType = '') {
      window.clearTimeout(this.timer)
      this.message = message
      this.type = type
      this.visible = true
      this.timer = window.setTimeout(() => {
        this.visible = false
      }, 3000)
    },
  },
})
