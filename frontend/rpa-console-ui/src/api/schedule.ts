import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/utils/request'
import type { CreateScheduleTaskRequest, PageResult, ScheduleTaskDetailVO, ScheduleTaskVO, TaskStatus } from '@/types/api'

export const scheduleApi = {
  list(params?: Record<string, unknown>) {
    return apiGet<PageResult<ScheduleTaskVO>>('/api/v1/schedule-tasks', { params })
  },
  create(payload: CreateScheduleTaskRequest) {
    return apiPost<ScheduleTaskDetailVO, CreateScheduleTaskRequest>('/api/v1/schedule-tasks', payload)
  },
  detail(taskId: string) {
    return apiGet<ScheduleTaskDetailVO>(`/api/v1/schedule-tasks/${taskId}`)
  },
  update(taskId: string, payload: Partial<CreateScheduleTaskRequest>) {
    return apiPut<boolean>(`/api/v1/schedule-tasks/${taskId}`, payload)
  },
  delete(taskId: string) {
    return apiDelete<boolean>(`/api/v1/schedule-tasks/${taskId}`)
  },
  updateStatus(taskId: string, status: TaskStatus) {
    return apiPatch<boolean>(`/api/v1/schedule-tasks/${taskId}/status`, { status })
  },
  trigger(taskId: string, payload: { idempotentUuid: string; inputParams?: unknown[] }) {
    return apiPost<{ executionId: string }>(`/api/v1/schedule-tasks/${taskId}/trigger`, payload)
  },
}
