import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { handleMockRequest } from '@/mocks/mockServer'
import { useAuthStore } from '@/stores/auth'
import type { ApiResponse } from '@/types/api'
import { isMockEnabled } from '@/utils/runtime'

export const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 10000,
  paramsSerializer: {
    indexes: null,
  },
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('rpa-console-token')
  const viewTenantId = localStorage.getItem('rpa-console-view-tenant-id')
  const viewDeptId = localStorage.getItem('rpa-console-view-dept-id')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (viewTenantId) {
    config.headers['X-View-Tenant-Id'] = viewTenantId
  }
  if (viewDeptId) {
    config.headers['X-View-Dept-Id'] = viewDeptId
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>
    if (body && typeof body.code === 'number' && body.code !== 0) {
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    return response
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore()
      auth.clearSession()
    }
    return Promise.reject(error)
  },
)

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  if (isMockEnabled) {
    return handleMockRequest<T>('GET', url, config)
  }
  const { data } = await request.get<ApiResponse<T>>(url, config)
  return data.data
}

export async function apiPost<T, D = unknown>(url: string, payload?: D, config?: AxiosRequestConfig): Promise<T> {
  if (isMockEnabled) {
    return handleMockRequest<T>('POST', url, config, payload)
  }
  const { data } = await request.post<ApiResponse<T>>(url, payload, config)
  return data.data
}

export async function apiPut<T, D = unknown>(url: string, payload?: D): Promise<T> {
  if (isMockEnabled) {
    return handleMockRequest<T>('PUT', url, undefined, payload)
  }
  const { data } = await request.put<ApiResponse<T>>(url, payload)
  return data.data
}

export async function apiPatch<T, D = unknown>(url: string, payload?: D): Promise<T> {
  if (isMockEnabled) {
    return handleMockRequest<T>('PATCH', url, undefined, payload)
  }
  const { data } = await request.patch<ApiResponse<T>>(url, payload)
  return data.data
}

export async function apiDelete<T>(url: string): Promise<T> {
  if (isMockEnabled) {
    return handleMockRequest<T>('DELETE', url)
  }
  const { data } = await request.delete<ApiResponse<T>>(url)
  return data.data
}
