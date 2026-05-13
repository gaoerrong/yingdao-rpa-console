import { apiGet, apiPost } from '@/utils/request'
import type { LoginRequest, LoginResponse, UserInfoVO } from '@/types/api'

export const authApi = {
  login(payload: LoginRequest) {
    return apiPost<LoginResponse, LoginRequest>('/api/v1/auth/login', payload)
  },
  logout() {
    return apiPost<boolean>('/api/v1/auth/logout')
  },
  me() {
    return apiGet<UserInfoVO>('/api/v1/auth/me')
  },
}
