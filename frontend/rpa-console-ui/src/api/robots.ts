import { apiGet, apiPost, apiPut } from '@/utils/request'
import type { PageResult, RobotGroupVO, RobotVO, SyncResult } from '@/types/api'

export const robotsApi = {
  list(params?: Record<string, unknown>) {
    return apiGet<PageResult<RobotVO>>('/api/v1/robots', { params })
  },
  sync() {
    return apiPost<SyncResult>('/api/v1/robots/sync')
  },
  detail(robotId: string) {
    return apiGet<RobotVO>(`/api/v1/robots/${robotId}`)
  },
  assignTenant(robotId: string, payload: { tenantId: string }) {
    return apiPut<boolean>(`/api/v1/robots/${robotId}/tenant`, payload)
  },
  assignDepartment(robotId: string, payload: { deptId: string | null }) {
    return apiPut<boolean>(`/api/v1/robots/${robotId}/department`, payload)
  },
  groups() {
    return apiGet<RobotGroupVO[]>('/api/v1/robot-groups')
  },
}
