import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/utils/request'
import type { DepartmentVO, PageResult, TenantStatus, TenantVO, ViewOptionsVO } from '@/types/api'

export const tenantsApi = {
  viewOptions() {
    return apiGet<ViewOptionsVO>('/api/v1/org/view-options')
  },
  list(params?: Record<string, unknown>) {
    return apiGet<PageResult<TenantVO>>('/api/v1/tenants', { params })
  },
  create(payload: { name: string; description?: string | null; adminAccountIds?: string[] }) {
    return apiPost<TenantVO>('/api/v1/tenants', payload)
  },
  update(tenantId: string, payload: { name?: string; description?: string | null }) {
    return apiPut<boolean>(`/api/v1/tenants/${tenantId}`, payload)
  },
  updateStatus(tenantId: string, status: TenantStatus) {
    return apiPatch<boolean>(`/api/v1/tenants/${tenantId}/status`, { status })
  },
  departments(tenantId: string) {
    return apiGet<DepartmentVO[]>(`/api/v1/tenants/${tenantId}/departments`)
  },
  createDepartment(tenantId: string, payload: { name: string; description?: string | null }) {
    return apiPost<DepartmentVO>(`/api/v1/tenants/${tenantId}/departments`, payload)
  },
  updateDepartment(deptId: string, payload: { name?: string; description?: string | null }) {
    return apiPut<boolean>(`/api/v1/departments/${deptId}`, payload)
  },
  deleteDepartment(deptId: string) {
    return apiDelete<boolean>(`/api/v1/departments/${deptId}`)
  },
}
