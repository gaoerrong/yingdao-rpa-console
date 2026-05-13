import { apiGet, apiPost } from '@/utils/request'
import type { PageResult, ScheduleBoardVO, TaskExecutionDetailVO, TaskExecutionVO } from '@/types/api'

export const executionsApi = {
  list(params?: Record<string, unknown>) {
    return apiGet<PageResult<TaskExecutionVO>>('/api/v1/task-executions', { params })
  },
  detail(executionId: string) {
    return apiGet<TaskExecutionDetailVO>(`/api/v1/task-executions/${executionId}`)
  },
  stop(executionId: string) {
    return apiPost<boolean>(`/api/v1/task-executions/${executionId}/stop`)
  },
  retry(executionId: string) {
    return apiPost<TaskExecutionVO>(`/api/v1/task-executions/${executionId}/retry`)
  },
  board(params?: Record<string, unknown>) {
    return apiGet<ScheduleBoardVO>('/api/v1/schedule-board', { params })
  },
}
