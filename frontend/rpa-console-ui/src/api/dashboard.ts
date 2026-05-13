import { apiGet } from '@/utils/request'
import type {
  DashboardAppRankingVO,
  DashboardRobotUtilizationVO,
  DashboardStatsVO,
  DashboardTagStatsVO,
  DashboardTrendVO,
} from '@/types/api'

export const dashboardApi = {
  stats(params?: Record<string, unknown>) {
    return apiGet<DashboardStatsVO>('/api/v1/dashboard/stats', { params })
  },
  executionTrend(params?: Record<string, unknown>) {
    return apiGet<DashboardTrendVO>('/api/v1/dashboard/execution-trend', { params })
  },
  appRanking(params?: Record<string, unknown>) {
    return apiGet<DashboardAppRankingVO>('/api/v1/dashboard/app-ranking', { params })
  },
  robotUtilization(params?: Record<string, unknown>) {
    return apiGet<DashboardRobotUtilizationVO>('/api/v1/dashboard/robot-utilization', { params })
  },
  tagStats(params?: Record<string, unknown>) {
    return apiGet<DashboardTagStatsVO>('/api/v1/dashboard/tag-stats', { params })
  },
}
