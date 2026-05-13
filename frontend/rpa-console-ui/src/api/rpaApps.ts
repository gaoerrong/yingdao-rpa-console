import { apiDelete, apiGet, apiPost } from '@/utils/request'
import type { PageResult, RpaAppDetailVO, RpaAppVO, SyncResult } from '@/types/api'

export const rpaAppsApi = {
  list(params?: Record<string, unknown>) {
    return apiGet<PageResult<RpaAppVO>>('/api/v1/rpa-apps', { params })
  },
  sync() {
    return apiPost<SyncResult>('/api/v1/rpa-apps/sync')
  },
  detail(appId: string) {
    return apiGet<RpaAppDetailVO>(`/api/v1/rpa-apps/${appId}`)
  },
  createMapping(appId: string, payload: { tenantId: string; deptId?: string | null }) {
    return apiPost<boolean>(`/api/v1/rpa-apps/${appId}/tenant-mappings`, payload)
  },
  deleteMapping(mappingId: string) {
    return apiDelete<boolean>(`/api/v1/rpa-apps/tenant-mappings/${mappingId}`)
  },
}
