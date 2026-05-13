export type ConsoleRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'MEMBER'
export type TenantStatus = 'ACTIVE' | 'INACTIVE'
export type RobotStatus = 'ONLINE' | 'OFFLINE' | 'BUSY'
export type ExecutionStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'STOPPED' | 'TIMEOUT'
export type ScheduleType = 'IMMEDIATE' | 'CRON'
export type TaskStatus = 'ENABLED' | 'DISABLED'
export type TriggerType = 'MANUAL' | 'SCHEDULED'
export type ResourceType = 'ACCOUNT' | 'RPA_APP' | 'ROBOT' | 'SCHEDULE_TASK'
export type Priority = '0' | '100' | '200'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export interface SyncResult {
  synced: number
  lastSyncTime: string
}

export interface UploadFileVO {
  fileKey: string
  fileName: string
}

export interface LoginRequest {
  loginAccount: string
  password: string
}

export interface LoginResponse {
  token: string
  userId: string
  name: string
  role: ConsoleRole
  tenantId?: string | null
  tenantName?: string | null
  deptId?: string | null
  deptName?: string | null
}

export interface UserInfoVO {
  accountId: string
  name: string
  loginAccount: string
  role: ConsoleRole
  tenantId?: string | null
  tenantName?: string | null
  deptId?: string | null
  deptName?: string | null
}

export interface TagSimpleVO {
  tagId: string
  name: string
  color: string
}

export interface TenantVO {
  tenantId: string
  name: string
  description?: string | null
  status: TenantStatus
  deptCount: number
  accountCount: number
  createdAt: string
}

export interface DepartmentVO {
  deptId: string
  tenantId: string
  name: string
  description?: string | null
  accountCount: number
  createdAt: string
}

export interface ViewOptionsVO {
  tenants: TenantVO[]
  departments: DepartmentVO[]
  selectedTenantId?: string | null
  selectedDeptId?: string | null
  allowTenantSwitch: boolean
  allowDeptSwitch: boolean
}

export interface AccountVO {
  accountId: string
  name: string
  loginAccount: string
  phone?: string | null
  xybotRole?: string | null
  xybotAccountType?: 'basic' | 'senior' | string | null
  tenantId?: string | null
  tenantName?: string | null
  deptId?: string | null
  deptName?: string | null
  consoleRole: ConsoleRole
  status: 'ACTIVE' | 'EXPIRED'
  tags: TagSimpleVO[]
  syncedAt: string
}

export interface AppParam {
  name: string
  type: string
  value?: unknown
  description?: string | null
  direction?: 'In' | 'Out'
  required?: boolean
}

export interface AppMappingVO {
  mappingId: string
  tenantId: string
  tenantName: string
  deptId?: string | null
  deptName?: string | null
}

export interface RpaAppVO {
  appId: string
  appUuid: string
  name: string
  version?: string | null
  supportParam: boolean
  ownerName?: string | null
  tenantMappings: AppMappingVO[]
  tags: TagSimpleVO[]
  status: 'ACTIVE' | 'EXPIRED'
  syncedAt: string
}

export interface RpaAppDetailVO extends RpaAppVO {
  description?: string | null
  inputParams: AppParam[]
  outputParams: AppParam[]
}

export interface RobotVO {
  robotId: string
  xybotRobotClientUuid: string
  name: string
  accountId?: string | null
  accountName?: string | null
  tenantId?: string | null
  tenantName?: string | null
  deptId?: string | null
  deptName?: string | null
  groupUuid?: string | null
  groupName?: string | null
  status: RobotStatus
  clientIp?: string | null
  currentAppName?: string | null
  lastHeartbeat?: string | null
  tags: TagSimpleVO[]
  syncedAt: string
}

export interface RobotGroupVO {
  groupId: string
  xybotGroupUuid: string
  name: string
}

export interface TagVO extends TagSimpleVO {
  description?: string | null
  accountCount: number
  appCount: number
  robotCount: number
  taskCount: number
  createdAt: string
  createdByName?: string
}

export interface ScheduleTaskVO {
  taskId: string
  name: string
  appId: string
  appName: string
  robotId?: string | null
  robotName?: string | null
  groupUuid?: string | null
  groupName?: string | null
  scheduleType: ScheduleType
  cronExpr?: string | null
  priority: Priority
  status: TaskStatus
  lastExecutionTime?: string | null
  lastExecutionStatus?: ExecutionStatus | null
  tags: TagSimpleVO[]
  createdBy: string
  createdByName: string
  createdAt: string
}

export interface ScheduleTaskDetailVO extends ScheduleTaskVO {
  description?: string | null
  executeScope?: 'any' | 'all' | null
  validFrom?: string | null
  validTo?: string | null
  inputParams: AppParam[]
  runTimeoutSeconds?: number | null
  waitTimeoutSeconds?: number | null
  retryTimes: number
  enableCloudLog: boolean
  enableCloudScreen: boolean
  callbackUrl?: string | null
}

export interface CreateScheduleTaskRequest {
  name: string
  description?: string | null
  tagIds?: string[]
  appId: string
  inputParams?: AppParam[]
  robotId?: string | null
  groupUuid?: string | null
  executeScope?: 'any' | 'all' | null
  scheduleType: ScheduleType
  cronExpr?: string | null
  validFrom?: string | null
  validTo?: string | null
  priority?: Priority
  runTimeoutSeconds?: number | null
  waitTimeoutSeconds?: number | null
  retryTimes?: number
  enableCloudLog?: boolean
  enableCloudScreen?: boolean
  callbackUrl?: string | null
}

export interface TaskExecutionVO {
  executionId: string
  taskId: string
  taskName: string
  appId: string
  appName: string
  robotId?: string | null
  robotName?: string | null
  triggeredBy: string
  triggerType: TriggerType
  triggeredAt: string
  startedAt?: string | null
  finishedAt?: string | null
  durationSeconds?: number | null
  status: ExecutionStatus
  errorMessage?: string | null
  cloudLogUrl?: string | null
  cloudScreenUrl?: string | null
}

export interface TaskExecutionDetailVO extends TaskExecutionVO {
  inputParamsSnapshot: AppParam[]
  outputParamsSnapshot?: AppParam[] | null
  screenshotUrl?: string | null
  xybotJobUuid?: string | null
}

export interface BoardExecutionVO {
  slotType: 'EXECUTION' | 'SCHEDULED_SLOT'
  executionId?: string | null
  taskId: string
  taskName: string
  appName: string
  startedAt?: string | null
  finishedAt?: string | null
  estimatedDurationMinutes?: number | null
  triggeredAt?: string | null
  status?: ExecutionStatus | null
}

export interface BoardRobotVO {
  robotId: string
  robotName: string
  status: RobotStatus
  groupName?: string | null
  executions: BoardExecutionVO[]
}

export interface ScheduleBoardVO {
  robots: BoardRobotVO[]
}

export interface DashboardStatsVO {
  todayExecutionCount: number
  todayExecutionCountDelta: number
  todaySuccessRate: number
  todaySuccessRateDelta: number
  todayRobotUtilization: number
  todayRobotUtilizationDelta: number
  totalExecutionCount: number
  activeRobotCount: number
}

export interface DashboardTrendVO {
  dates: string[]
  successCounts: number[]
  failedCounts: number[]
}

export interface DashboardAppRankingItemVO {
  appName: string
  executionCount: number
}

export interface DashboardAppRankingVO {
  items: DashboardAppRankingItemVO[]
}

export interface DashboardRobotUtilizationItemVO {
  robotName: string
  utilizationRate: number
}

export interface DashboardRobotUtilizationVO {
  items: DashboardRobotUtilizationItemVO[]
}

export interface DashboardTagStatsItemVO {
  tagName: string
  color: string
  executionCount: number
}

export interface DashboardTagStatsVO {
  items: DashboardTagStatsItemVO[]
}
