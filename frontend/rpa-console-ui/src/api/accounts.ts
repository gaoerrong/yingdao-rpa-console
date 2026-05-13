import { apiGet, apiPost, apiPut } from '@/utils/request'
import type { AccountVO, ConsoleRole, PageResult, SyncResult } from '@/types/api'

export const accountsApi = {
  list(params?: Record<string, unknown>) {
    return apiGet<PageResult<AccountVO>>('/api/v1/accounts', { params })
  },
  detail(accountId: string) {
    return apiGet<AccountVO>(`/api/v1/accounts/${accountId}`)
  },
  sync() {
    return apiPost<SyncResult>('/api/v1/accounts/sync')
  },
  assignTenant(accountId: string, payload: { tenantId: string; role?: ConsoleRole }) {
    return apiPut<boolean>(`/api/v1/accounts/${accountId}/tenant`, payload)
  },
  assignDepartment(accountId: string, deptId: string | null) {
    return apiPut<boolean>(`/api/v1/accounts/${accountId}/department`, { deptId })
  },
  updateRole(accountId: string, role: ConsoleRole) {
    return apiPut<boolean>(`/api/v1/accounts/${accountId}/role`, { role })
  },
}
