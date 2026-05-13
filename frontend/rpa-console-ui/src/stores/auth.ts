import { defineStore } from 'pinia'
import { authApi } from '@/api/auth'
import type { LoginRequest, UserInfoVO } from '@/types/api'
import { isMockEnabled } from '@/utils/runtime'

const tokenKey = 'rpa-console-token'
const userKey = 'rpa-console-user'

const demoUser: UserInfoVO = {
  accountId: 'admin@ydcs',
  name: '超级管理员',
  loginAccount: 'admin@ydcs',
  role: 'SUPER_ADMIN',
  tenantId: null,
  tenantName: null,
  deptId: null,
  deptName: null,
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(tokenKey) || '',
    user: JSON.parse(localStorage.getItem(userKey) || 'null') as UserInfoVO | null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    role: (state) => state.user?.role || 'MEMBER',
  },
  actions: {
    persist(token: string, user: UserInfoVO) {
      this.token = token
      this.user = user
      localStorage.setItem(tokenKey, token)
      localStorage.setItem(userKey, JSON.stringify(user))
    },
    async login(payload: LoginRequest) {
      try {
        const res = await authApi.login(payload)
        this.persist(res.token, {
          accountId: res.userId,
          name: res.name,
          loginAccount: payload.loginAccount,
          role: res.role,
          tenantId: res.tenantId,
          tenantName: res.tenantName ?? null,
          deptId: res.deptId,
          deptName: res.deptName ?? null,
        })
      } catch (error) {
        if (isMockEnabled) throw error
        if (payload.password !== '123456') throw error
        const role = payload.loginAccount.includes('admin') ? 'SUPER_ADMIN' : payload.loginAccount.startsWith('tenant-admin-') ? 'TENANT_ADMIN' : 'MEMBER'
        this.persist(`demo-token-${Date.now()}`, {
          ...demoUser,
          accountId: payload.loginAccount,
          name: payload.loginAccount.includes('admin') ? '超级管理员' : payload.loginAccount,
          loginAccount: payload.loginAccount,
          role,
          tenantId: role === 'SUPER_ADMIN' ? null : 'tenant-a',
          tenantName: role === 'SUPER_ADMIN' ? null : '租户 A',
          deptId: role === 'MEMBER' ? 'dept-a1' : null,
          deptName: role === 'MEMBER' ? '部门 A1' : null,
        })
      }
    },
    async ssoDemoLogin() {
      this.persist(`demo-sso-token-${Date.now()}`, demoUser)
    },
    async hydrate() {
      if (!this.token) return
      try {
        this.user = await authApi.me()
        localStorage.setItem(userKey, JSON.stringify(this.user))
      } catch {
        if (!this.user) this.clearSession()
      }
    },
    async logout() {
      try {
        await authApi.logout()
      } finally {
        this.clearSession()
      }
    },
    clearSession() {
      this.token = ''
      this.user = null
      localStorage.removeItem(tokenKey)
      localStorage.removeItem(userKey)
      localStorage.removeItem('rpa-console-view-tenant-id')
      localStorage.removeItem('rpa-console-view-dept-id')
    },
  },
})
