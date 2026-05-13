import type { AxiosRequestConfig } from 'axios'
import {
  accounts as seedAccounts,
  appDetails as seedAppDetails,
  apps as seedApps,
  boardRobots as seedBoardRobots,
  departments as seedDepartments,
  executionDetails as seedExecutionDetails,
  executions as seedExecutions,
  robotGroups as seedRobotGroups,
  robots as seedRobots,
  tags as seedTags,
  tasks as seedTasks,
  tenants as seedTenants,
} from '@/mocks/demoData'
import type {
  AccountVO,
  AppParam,
  BoardRobotVO,
  ConsoleRole,
  CreateScheduleTaskRequest,
  DashboardAppRankingVO,
  DashboardRobotUtilizationVO,
  DashboardStatsVO,
  DashboardTagStatsVO,
  DashboardTrendVO,
  DepartmentVO,
  LoginRequest,
  LoginResponse,
  PageResult,
  RobotGroupVO,
  RobotVO,
  RpaAppDetailVO,
  RpaAppVO,
  ScheduleBoardVO,
  ScheduleTaskDetailVO,
  ScheduleTaskVO,
  SyncResult,
  TagVO,
  TaskExecutionDetailVO,
  TaskExecutionVO,
  TaskStatus,
  TenantStatus,
  TenantVO,
  UploadFileVO,
  UserInfoVO,
  ViewOptionsVO,
} from '@/types/api'

type MockMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type MockState = {
  tenants: TenantVO[]
  departments: DepartmentVO[]
  tags: TagVO[]
  accounts: AccountVO[]
  apps: RpaAppVO[]
  appDetails: RpaAppDetailVO[]
  robots: RobotVO[]
  robotGroups: RobotGroupVO[]
  tasks: ScheduleTaskDetailVO[]
  executions: TaskExecutionVO[]
  executionDetails: TaskExecutionDetailVO[]
  boardRobots: BoardRobotVO[]
}

const MOCK_STATE_KEY = 'rpa-console-mock-state'
const MOCK_USER_KEY = 'rpa-console-mock-user'
const MOCK_DELAY_MS = 120

export async function handleMockRequest<T>(method: MockMethod, url: string, config?: AxiosRequestConfig, payload?: unknown): Promise<T> {
  await sleep(MOCK_DELAY_MS)
  const path = normalizePath(url)
  const params = readParams(config)
  const body = payload as Record<string, unknown> | undefined
  const state = loadState()

  if (method === 'POST' && path === '/api/v1/auth/login') {
    const login = payload as LoginRequest
    const response = mockLogin(login)
    persistMockUser(response, login.loginAccount)
    return response as T
  }

  if (method === 'POST' && path === '/api/v1/auth/logout') {
    localStorage.removeItem(MOCK_USER_KEY)
    return true as T
  }

  if (method === 'GET' && path === '/api/v1/auth/me') {
    return readMockUser() as T
  }

  if (method === 'GET' && path === '/api/v1/org/view-options') {
    const user = readMockUser()
    const tenantId = user.role === 'SUPER_ADMIN' ? null : user.tenantId || null
    const departments = tenantId ? state.departments.filter((item) => item.tenantId === tenantId) : state.departments
    return {
      tenants: state.tenants,
      departments,
      selectedTenantId: tenantId,
      selectedDeptId: user.deptId || null,
      allowTenantSwitch: user.role === 'SUPER_ADMIN',
      allowDeptSwitch: true,
    } satisfies ViewOptionsVO as T
  }

  if (method === 'GET' && path === '/api/v1/tenants') {
    return pageResult(filterTenants(state.tenants, params), params) as T
  }

  if (method === 'POST' && path === '/api/v1/tenants') {
    const tenant = createTenant(state, body)
    saveState(state)
    return tenant as T
  }

  if (method === 'PUT' && path.startsWith('/api/v1/tenants/')) {
    updateTenant(state, path.split('/')[4], body)
    saveState(state)
    return true as T
  }

  if (method === 'PATCH' && path.match(/^\/api\/v1\/tenants\/[^/]+\/status$/)) {
    updateTenantStatus(state, path.split('/')[4], String(body?.status || 'ACTIVE') as TenantStatus)
    saveState(state)
    return true as T
  }

  if (method === 'GET' && path.match(/^\/api\/v1\/tenants\/[^/]+\/departments$/)) {
    const tenantId = path.split('/')[4]
    return clone(state.departments.filter((item) => item.tenantId === tenantId)) as T
  }

  if (method === 'POST' && path.match(/^\/api\/v1\/tenants\/[^/]+\/departments$/)) {
    const tenantId = path.split('/')[4]
    const department = createDepartment(state, tenantId, body)
    saveState(state)
    return department as T
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/departments\/[^/]+$/)) {
    updateDepartment(state, path.split('/')[4], body)
    saveState(state)
    return true as T
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/departments\/[^/]+$/)) {
    deleteDepartment(state, path.split('/')[4])
    saveState(state)
    return true as T
  }

  if (method === 'GET' && path === '/api/v1/accounts') {
    return pageResult(filterAccounts(state.accounts, params), params) as T
  }

  if (method === 'GET' && path.match(/^\/api\/v1\/accounts\/[^/]+$/)) {
    return requireItem(state.accounts.find((item) => item.accountId === path.split('/')[4]), '账号不存在') as T
  }

  if (method === 'POST' && path === '/api/v1/accounts/sync') {
    return syncResult(state.accounts.length) as T
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/accounts\/[^/]+\/tenant$/)) {
    assignAccountTenant(state, path.split('/')[4], body)
    saveState(state)
    return true as T
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/accounts\/[^/]+\/department$/)) {
    assignAccountDepartment(state, path.split('/')[4], body)
    saveState(state)
    return true as T
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/accounts\/[^/]+\/role$/)) {
    assignAccountRole(state, path.split('/')[4], body)
    saveState(state)
    return true as T
  }

  if (method === 'GET' && path === '/api/v1/rpa-apps') {
    return pageResult(filterApps(state.apps, params), params) as T
  }

  if (method === 'POST' && path === '/api/v1/rpa-apps/sync') {
    return syncResult(state.apps.length) as T
  }

  if (method === 'GET' && path.match(/^\/api\/v1\/rpa-apps\/[^/]+$/)) {
    return requireItem(state.appDetails.find((item) => item.appId === path.split('/')[4]), '应用不存在') as T
  }

  if (method === 'POST' && path.match(/^\/api\/v1\/rpa-apps\/[^/]+\/tenant-mappings$/)) {
    createAppMapping(state, path.split('/')[4], body)
    saveState(state)
    return true as T
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/rpa-apps\/tenant-mappings\/[^/]+$/)) {
    deleteAppMapping(state, path.split('/')[5])
    saveState(state)
    return true as T
  }

  if (method === 'GET' && path === '/api/v1/robots') {
    return pageResult(filterRobots(state.robots, params), params) as T
  }

  if (method === 'POST' && path === '/api/v1/robots/sync') {
    return syncResult(state.robots.length) as T
  }

  if (method === 'GET' && path.match(/^\/api\/v1\/robots\/[^/]+$/)) {
    return requireItem(state.robots.find((item) => item.robotId === path.split('/')[4]), '机器人不存在') as T
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/robots\/[^/]+\/tenant$/)) {
    assignRobotTenant(state, path.split('/')[4], body)
    saveState(state)
    return true as T
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/robots\/[^/]+\/department$/)) {
    assignRobotDepartment(state, path.split('/')[4], body)
    saveState(state)
    return true as T
  }

  if (method === 'GET' && path === '/api/v1/robot-groups') {
    return clone(state.robotGroups) as T
  }

  if (method === 'GET' && path === '/api/v1/tags') {
    return clone(state.tags) as T
  }

  if (method === 'GET' && path === '/api/v1/tags/page') {
    return pageResult(filterTags(state.tags, params), params) as T
  }

  if (method === 'POST' && path === '/api/v1/tags') {
    const tag = createTag(state, body)
    saveState(state)
    return tag as T
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/tags\/[^/]+$/)) {
    updateTag(state, path.split('/')[4], body)
    saveState(state)
    return true as T
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/tags\/[^/]+$/)) {
    deleteTag(state, path.split('/')[4])
    saveState(state)
    return true as T
  }

  if (method === 'PUT' && path === '/api/v1/resource-tags') {
    setResourceTags(state, body, false)
    saveState(state)
    return true as T
  }

  if (method === 'PUT' && path === '/api/v1/resource-tags/batch') {
    setResourceTags(state, body, true)
    saveState(state)
    return true as T
  }

  if (method === 'GET' && path === '/api/v1/schedule-tasks') {
    return pageResult(filterTasks(state.tasks, params), params) as T
  }

  if (method === 'POST' && path === '/api/v1/schedule-tasks') {
    const task = createTask(state, payload as unknown as CreateScheduleTaskRequest)
    saveState(state)
    return task as T
  }

  if (method === 'GET' && path.match(/^\/api\/v1\/schedule-tasks\/[^/]+$/)) {
    return requireItem(state.tasks.find((item) => item.taskId === path.split('/')[4]), '任务不存在') as T
  }

  if (method === 'PUT' && path.match(/^\/api\/v1\/schedule-tasks\/[^/]+$/)) {
    updateTask(state, path.split('/')[4], body)
    saveState(state)
    return true as T
  }

  if (method === 'DELETE' && path.match(/^\/api\/v1\/schedule-tasks\/[^/]+$/)) {
    deleteTask(state, path.split('/')[4])
    saveState(state)
    return true as T
  }

  if (method === 'PATCH' && path.match(/^\/api\/v1\/schedule-tasks\/[^/]+\/status$/)) {
    updateTaskStatus(state, path.split('/')[4], String(body?.status || 'ENABLED') as TaskStatus)
    saveState(state)
    return true as T
  }

  if (method === 'POST' && path.match(/^\/api\/v1\/schedule-tasks\/[^/]+\/trigger$/)) {
    const executionId = triggerTask(state, path.split('/')[4])
    saveState(state)
    return { executionId } as T
  }

  if (method === 'GET' && path === '/api/v1/task-executions') {
    return pageResult(filterExecutions(state.executions, params), params) as T
  }

  if (method === 'GET' && path.match(/^\/api\/v1\/task-executions\/[^/]+$/)) {
    return requireItem(state.executionDetails.find((item) => item.executionId === path.split('/')[4]), '执行记录不存在') as T
  }

  if (method === 'POST' && path.match(/^\/api\/v1\/task-executions\/[^/]+\/stop$/)) {
    stopExecution(state, path.split('/')[4])
    saveState(state)
    return true as T
  }

  if (method === 'POST' && path.match(/^\/api\/v1\/task-executions\/[^/]+\/retry$/)) {
    const execution = retryExecution(state, path.split('/')[4])
    saveState(state)
    return execution as T
  }

  if (method === 'GET' && path === '/api/v1/schedule-board') {
    return filterBoard(state, params) as T
  }

  if (method === 'GET' && path === '/api/v1/dashboard/stats') {
    return buildStats(state.executions, state.robots) as T
  }

  if (method === 'GET' && path === '/api/v1/dashboard/execution-trend') {
    return buildTrend(state.executions) as T
  }

  if (method === 'GET' && path === '/api/v1/dashboard/app-ranking') {
    return buildAppRanking(state.executions) as T
  }

  if (method === 'GET' && path === '/api/v1/dashboard/robot-utilization') {
    return buildRobotUtilization(state.boardRobots) as T
  }

  if (method === 'GET' && path === '/api/v1/dashboard/tag-stats') {
    return buildTagStats(state.tags, state.tasks) as T
  }

  if (method === 'POST' && path === '/api/v1/files/upload') {
    return {
      fileKey: `mock-file-${Date.now()}`,
      fileName: extractUploadFileName(payload),
    } satisfies UploadFileVO as T
  }

  throw new Error(`Mock route not implemented: ${method} ${path}`)
}

function loadState(): MockState {
  const raw = localStorage.getItem(MOCK_STATE_KEY)
  if (raw) {
    return JSON.parse(raw) as MockState
  }
  const seeded = seedState()
  saveState(seeded)
  return seeded
}

function saveState(state: MockState) {
  localStorage.setItem(MOCK_STATE_KEY, JSON.stringify(state))
}

function seedState(): MockState {
  const tasks = seedTasks.map<ScheduleTaskDetailVO>((task, index) => ({
    ...clone(task),
    description: `${task.name} 的公开版演示任务`,
    executeScope: task.groupUuid ? 'any' : null,
    validFrom: index % 2 === 0 ? '2026-05-01 00:00:00' : null,
    validTo: index % 2 === 0 ? '2026-12-31 23:59:59' : null,
    inputParams: [
      { name: 'file_path', type: 'file', value: null, description: '演示文件', direction: 'In', required: true },
      { name: 'sheet_index', type: 'float', value: 1, description: '工作表序号', direction: 'In' },
    ],
    runTimeoutSeconds: 1800,
    waitTimeoutSeconds: 600,
    retryTimes: 1,
    enableCloudLog: true,
    enableCloudScreen: false,
    callbackUrl: null,
  }))
  return {
    tenants: clone(seedTenants),
    departments: clone(seedDepartments),
    tags: clone(seedTags),
    accounts: clone(seedAccounts),
    apps: clone(seedApps),
    appDetails: clone(seedAppDetails),
    robots: clone(seedRobots),
    robotGroups: clone(seedRobotGroups),
    tasks,
    executions: clone(seedExecutions),
    executionDetails: clone(seedExecutionDetails),
    boardRobots: clone(seedBoardRobots),
  }
}

function mockLogin(payload: LoginRequest): LoginResponse {
  const role: ConsoleRole = payload.loginAccount.includes('admin')
    ? 'SUPER_ADMIN'
    : payload.loginAccount.startsWith('tenant-admin')
      ? 'TENANT_ADMIN'
      : 'MEMBER'
  const loginAccount = payload.loginAccount.trim() || 'admin@example.com'
  return {
    token: `mock-token-${Date.now()}`,
    userId: loginAccount,
    name: role === 'SUPER_ADMIN' ? 'Demo Administrator' : loginAccount,
    role,
    tenantId: role === 'SUPER_ADMIN' ? null : 'tenant-001',
    tenantName: role === 'SUPER_ADMIN' ? null : '华东子公司',
    deptId: role === 'MEMBER' ? 'dept-t001-001' : null,
    deptName: role === 'MEMBER' ? '财务部' : null,
  }
}

function persistMockUser(response: LoginResponse, loginAccount: string) {
  const user: UserInfoVO = {
    accountId: response.userId,
    name: response.name,
    loginAccount,
    role: response.role,
    tenantId: response.tenantId ?? null,
    tenantName: response.tenantName ?? null,
    deptId: response.deptId ?? null,
    deptName: response.deptName ?? null,
  }
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user))
}

function readMockUser(): UserInfoVO {
  const raw = localStorage.getItem(MOCK_USER_KEY)
  if (raw) {
    return JSON.parse(raw) as UserInfoVO
  }
  const user: UserInfoVO = {
    accountId: 'mock-admin',
    name: 'Demo Administrator',
    loginAccount: 'admin@example.com',
    role: 'SUPER_ADMIN',
    tenantId: null,
    tenantName: null,
    deptId: null,
    deptName: null,
  }
  localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user))
  return user
}

function pageResult<T>(records: T[], params: Record<string, unknown>): PageResult<T> {
  const current = numberParam(params.page, 1)
  const size = numberParam(params.size, records.length || 20)
  const start = (current - 1) * size
  return {
    records: clone(records.slice(start, start + size)),
    total: records.length,
    current,
    size,
  }
}

function syncResult(count: number): SyncResult {
  return { synced: count, lastSyncTime: new Date().toISOString() }
}

function filterTenants(items: TenantVO[], params: Record<string, unknown>) {
  const keyword = lower(params.keyword)
  return items.filter((item) => !keyword || item.name.toLowerCase().includes(keyword))
}

function filterAccounts(items: AccountVO[], params: Record<string, unknown>) {
  const keyword = lower(params.keyword)
  const role = String(params.role || '')
  const tenantId = String(params.tenantId || '')
  const deptId = String(params.deptId || '')
  const tagIds = arrayParam(params.tagIds)
  return items.filter((item) =>
    (!keyword || [item.name, item.loginAccount, item.tenantName, item.deptName].some((field) => String(field || '').toLowerCase().includes(keyword)))
    && (!role || item.consoleRole === role)
    && (!tenantId || item.tenantId === tenantId)
    && (!deptId || item.deptId === deptId)
    && (!tagIds.length || tagIds.every((tagId) => item.tags.some((tag) => tag.tagId === tagId))),
  )
}

function filterApps(items: RpaAppVO[], params: Record<string, unknown>) {
  const name = lower(params.name)
  const tagIds = arrayParam(params.tagIds)
  return items.filter((item) =>
    (!name || item.name.toLowerCase().includes(name))
    && (!tagIds.length || tagIds.every((tagId) => item.tags.some((tag) => tag.tagId === tagId))),
  )
}

function filterRobots(items: RobotVO[], params: Record<string, unknown>) {
  const keyword = lower(params.keyword)
  const status = String(params.status || '')
  const tagIds = arrayParam(params.tagIds)
  return items.filter((item) =>
    (!keyword || [item.name, item.accountName, item.groupName].some((field) => String(field || '').toLowerCase().includes(keyword)))
    && (!status || item.status === status)
    && (!tagIds.length || tagIds.every((tagId) => item.tags.some((tag) => tag.tagId === tagId))),
  )
}

function filterTags(items: TagVO[], params: Record<string, unknown>) {
  const keyword = lower(params.keyword)
  return items.filter((item) => !keyword || [item.name, item.description].some((field) => String(field || '').toLowerCase().includes(keyword)))
}

function filterTasks(items: ScheduleTaskDetailVO[], params: Record<string, unknown>) {
  const keyword = lower(params.keyword)
  const status = String(params.status || '')
  const tagIds = arrayParam(params.tagIds)
  return items.filter((item) =>
    (!keyword || [item.name, item.appName, item.robotName, item.groupName].some((field) => String(field || '').toLowerCase().includes(keyword)))
    && (!status || item.status === status)
    && (!tagIds.length || tagIds.every((tagId) => item.tags.some((tag) => tag.tagId === tagId))),
  )
}

function filterExecutions(items: TaskExecutionVO[], params: Record<string, unknown>) {
  const keyword = lower(params.keyword)
  const status = String(params.status || '')
  return items.filter((item) =>
    (!keyword || [item.taskName, item.appName, item.robotName, item.triggeredBy].some((field) => String(field || '').toLowerCase().includes(keyword)))
    && (!status || item.status === status),
  )
}

function buildStats(executions: TaskExecutionVO[], robots: RobotVO[]): DashboardStatsVO {
  const todaySuccess = executions.filter((item) => item.status === 'SUCCESS').length
  const todayFailed = executions.filter((item) => item.status === 'FAILED' || item.status === 'TIMEOUT').length
  return {
    todayExecutionCount: executions.length,
    todayExecutionCountDelta: 8,
    todaySuccessRate: executions.length ? todaySuccess / executions.length : 0,
    todaySuccessRateDelta: 0.06,
    todayRobotUtilization: 0.64,
    todayRobotUtilizationDelta: 0.08,
    totalExecutionCount: executions.length * 12,
    activeRobotCount: robots.filter((item) => item.status !== 'OFFLINE').length + todayFailed * 0,
  }
}

function buildTrend(executions: TaskExecutionVO[]): DashboardTrendVO {
  const dates = ['2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09']
  const successCounts = dates.map((_, index) => Math.max(3, 6 + index - (index === 5 ? 2 : 0)))
  const failedCounts = dates.map((_, index) => (index === 5 ? 2 : index === 4 ? 1 : 0))
  return { dates, successCounts, failedCounts }
}

function buildAppRanking(executions: TaskExecutionVO[]): DashboardAppRankingVO {
  const grouped = new Map<string, number>()
  executions.forEach((item) => grouped.set(item.appName, (grouped.get(item.appName) || 0) + 1))
  return {
    items: Array.from(grouped.entries())
      .map(([appName, executionCount]) => ({ appName, executionCount }))
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 5),
  }
}

function buildRobotUtilization(board: BoardRobotVO[]): DashboardRobotUtilizationVO {
  return {
    items: board.map((item) => ({
      robotName: item.robotName,
      utilizationRate: Math.min(0.2 + item.executions.length * 0.15, 0.92),
    })),
  }
}

function buildTagStats(tags: TagVO[], tasks: ScheduleTaskDetailVO[]): DashboardTagStatsVO {
  return {
    items: tags
      .map((tag) => ({
        tagName: tag.name,
        color: tag.color,
        executionCount: tasks.filter((task) => task.tags.some((taskTag) => taskTag.tagId === tag.tagId)).length * 3,
      }))
      .filter((item) => item.executionCount > 0)
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 6),
  }
}

function filterBoard(state: MockState, params: Record<string, unknown>): ScheduleBoardVO {
  const groupUuid = String(params.groupUuid || '')
  const tagIds = arrayParam(params.tagIds)
  const taskMap = new Map(state.tasks.map((item) => [item.taskId, item]))
  let robots = clone(state.boardRobots)
  if (groupUuid) {
    const group = state.robotGroups.find((item) => item.xybotGroupUuid === groupUuid)
    robots = robots.filter((item) => item.groupName === group?.name)
  }
  if (tagIds.length) {
    robots = robots.map((robot) => ({
      ...robot,
      executions: robot.executions.filter((slot) => {
        const task = taskMap.get(slot.taskId)
        return task ? tagIds.every((tagId) => task.tags.some((tag) => tag.tagId === tagId)) : false
      }),
    }))
  }
  return { robots }
}

function createTenant(state: MockState, body?: Record<string, unknown>) {
  const tenant: TenantVO = {
    tenantId: `tenant-${Date.now()}`,
    name: String(body?.name || '新租户'),
    description: String(body?.description || ''),
    status: 'ACTIVE',
    deptCount: 0,
    accountCount: 0,
    createdAt: today(),
  }
  state.tenants.unshift(tenant)
  return tenant
}

function updateTenant(state: MockState, tenantId: string, body?: Record<string, unknown>) {
  const tenant = requireItem(state.tenants.find((item) => item.tenantId === tenantId), '租户不存在')
  tenant.name = String(body?.name || tenant.name)
  tenant.description = String(body?.description || tenant.description || '')
}

function updateTenantStatus(state: MockState, tenantId: string, status: TenantStatus) {
  const tenant = requireItem(state.tenants.find((item) => item.tenantId === tenantId), '租户不存在')
  tenant.status = status
}

function createDepartment(state: MockState, tenantId: string, body?: Record<string, unknown>) {
  const department: DepartmentVO = {
    deptId: `dept-${Date.now()}`,
    tenantId,
    name: String(body?.name || '新部门'),
    description: String(body?.description || ''),
    accountCount: 0,
    createdAt: today(),
  }
  state.departments.unshift(department)
  return department
}

function updateDepartment(state: MockState, deptId: string, body?: Record<string, unknown>) {
  const department = requireItem(state.departments.find((item) => item.deptId === deptId), '部门不存在')
  department.name = String(body?.name || department.name)
  department.description = String(body?.description || department.description || '')
}

function deleteDepartment(state: MockState, deptId: string) {
  state.departments = state.departments.filter((item) => item.deptId !== deptId)
}

function createTag(state: MockState, body?: Record<string, unknown>) {
  const tag: TagVO = {
    tagId: `tag-${Date.now()}`,
    name: String(body?.name || '新标签'),
    color: String(body?.color || '#3b82f6'),
    description: String(body?.description || ''),
    accountCount: 0,
    appCount: 0,
    robotCount: 0,
    taskCount: 0,
    createdAt: today(),
    createdByName: 'Demo Administrator',
  }
  state.tags.unshift(tag)
  return tag
}

function updateTag(state: MockState, tagId: string, body?: Record<string, unknown>) {
  const tag = requireItem(state.tags.find((item) => item.tagId === tagId), '标签不存在')
  tag.name = String(body?.name || tag.name)
  tag.color = String(body?.color || tag.color)
  tag.description = String(body?.description || tag.description || '')
}

function deleteTag(state: MockState, tagId: string) {
  state.tags = state.tags.filter((item) => item.tagId !== tagId)
}

function assignAccountTenant(state: MockState, accountId: string, body?: Record<string, unknown>) {
  const account = requireItem(state.accounts.find((item) => item.accountId === accountId), '账号不存在')
  const tenant = state.tenants.find((item) => item.tenantId === String(body?.tenantId || ''))
  account.tenantId = tenant?.tenantId || null
  account.tenantName = tenant?.name || null
}

function assignAccountDepartment(state: MockState, accountId: string, body?: Record<string, unknown>) {
  const account = requireItem(state.accounts.find((item) => item.accountId === accountId), '账号不存在')
  const department = state.departments.find((item) => item.deptId === String(body?.deptId || ''))
  account.deptId = department?.deptId || null
  account.deptName = department?.name || null
}

function assignAccountRole(state: MockState, accountId: string, body?: Record<string, unknown>) {
  const account = requireItem(state.accounts.find((item) => item.accountId === accountId), '账号不存在')
  account.consoleRole = String(body?.role || account.consoleRole) as ConsoleRole
}

function createAppMapping(state: MockState, appId: string, body?: Record<string, unknown>) {
  const app = requireItem(state.apps.find((item) => item.appId === appId), '应用不存在')
  const detail = requireItem(state.appDetails.find((item) => item.appId === appId), '应用不存在')
  const tenant = state.tenants.find((item) => item.tenantId === String(body?.tenantId || ''))
  const department = state.departments.find((item) => item.deptId === String(body?.deptId || ''))
  const mapping = {
    mappingId: `mapping-${Date.now()}`,
    tenantId: tenant?.tenantId || String(body?.tenantId || ''),
    tenantName: tenant?.name || String(body?.tenantId || ''),
    deptId: department?.deptId || null,
    deptName: department?.name || null,
  }
  app.tenantMappings.unshift(mapping)
  detail.tenantMappings.unshift(clone(mapping))
}

function deleteAppMapping(state: MockState, mappingId: string) {
  state.apps.forEach((item) => {
    item.tenantMappings = item.tenantMappings.filter((mapping) => mapping.mappingId !== mappingId)
  })
  state.appDetails.forEach((item) => {
    item.tenantMappings = item.tenantMappings.filter((mapping) => mapping.mappingId !== mappingId)
  })
}

function assignRobotTenant(state: MockState, robotId: string, body?: Record<string, unknown>) {
  const robot = requireItem(state.robots.find((item) => item.robotId === robotId), '机器人不存在')
  const tenant = state.tenants.find((item) => item.tenantId === String(body?.tenantId || ''))
  robot.tenantId = tenant?.tenantId || null
  robot.tenantName = tenant?.name || null
}

function assignRobotDepartment(state: MockState, robotId: string, body?: Record<string, unknown>) {
  const robot = requireItem(state.robots.find((item) => item.robotId === robotId), '机器人不存在')
  const department = state.departments.find((item) => item.deptId === String(body?.deptId || ''))
  robot.deptId = department?.deptId || null
  robot.deptName = department?.name || null
}

function createTask(state: MockState, payload: CreateScheduleTaskRequest) {
  const app = requireItem(state.apps.find((item) => item.appId === payload.appId), '应用不存在')
  const robot = payload.robotId ? state.robots.find((item) => item.robotId === payload.robotId) : null
  const group = payload.groupUuid ? state.robotGroups.find((item) => item.xybotGroupUuid === payload.groupUuid) : null
  const task: ScheduleTaskDetailVO = {
    taskId: `task-${Date.now()}`,
    name: payload.name,
    appId: payload.appId,
    appName: `${app.name}${app.version ? ` ${app.version}` : ''}`,
    robotId: robot?.robotId || null,
    robotName: robot?.name || null,
    groupUuid: payload.groupUuid || null,
    groupName: group?.name || null,
    scheduleType: payload.scheduleType,
    cronExpr: payload.cronExpr || null,
    priority: payload.priority || '100',
    status: 'ENABLED',
    lastExecutionTime: null,
    lastExecutionStatus: null,
    tags: tagObjects(state.tags, payload.tagIds || []),
    createdBy: readMockUser().accountId,
    createdByName: readMockUser().name,
    createdAt: today(),
    description: payload.description || null,
    executeScope: payload.executeScope || null,
    validFrom: payload.validFrom || null,
    validTo: payload.validTo || null,
    inputParams: (payload.inputParams as AppParam[]) || [],
    runTimeoutSeconds: payload.runTimeoutSeconds || 1800,
    waitTimeoutSeconds: payload.waitTimeoutSeconds || 600,
    retryTimes: payload.retryTimes || 0,
    enableCloudLog: payload.enableCloudLog ?? true,
    enableCloudScreen: payload.enableCloudScreen ?? false,
    callbackUrl: payload.callbackUrl || null,
  }
  state.tasks.unshift(task)
  return task
}

function updateTask(state: MockState, taskId: string, body?: Record<string, unknown>) {
  const task = requireItem(state.tasks.find((item) => item.taskId === taskId), '任务不存在')
  task.name = String(body?.name || task.name)
  task.description = body?.description == null ? task.description : String(body.description)
  task.cronExpr = body?.cronExpr == null ? task.cronExpr : String(body.cronExpr || '')
  task.validFrom = body?.validFrom == null ? task.validFrom : String(body.validFrom || '')
  task.validTo = body?.validTo == null ? task.validTo : String(body.validTo || '')
  task.priority = String(body?.priority || task.priority) as ScheduleTaskDetailVO['priority']
  task.enableCloudLog = body?.enableCloudLog == null ? task.enableCloudLog : Boolean(body.enableCloudLog)
  task.enableCloudScreen = body?.enableCloudScreen == null ? task.enableCloudScreen : Boolean(body.enableCloudScreen)
}

function deleteTask(state: MockState, taskId: string) {
  state.tasks = state.tasks.filter((item) => item.taskId !== taskId)
}

function updateTaskStatus(state: MockState, taskId: string, status: TaskStatus) {
  const task = requireItem(state.tasks.find((item) => item.taskId === taskId), '任务不存在')
  task.status = status
}

function triggerTask(state: MockState, taskId: string) {
  const task = requireItem(state.tasks.find((item) => item.taskId === taskId), '任务不存在')
  const executionId = `EXC-${Date.now()}`
  const execution: TaskExecutionDetailVO = {
    executionId,
    taskId,
    taskName: task.name,
    appId: task.appId,
    appName: task.appName,
    robotId: task.robotId || null,
    robotName: task.robotName || task.groupName || '待分配机器人',
    triggeredBy: readMockUser().name,
    triggerType: 'MANUAL',
    triggeredAt: todayTime(),
    startedAt: todayTime(),
    finishedAt: null,
    durationSeconds: null,
    status: 'RUNNING',
    inputParamsSnapshot: clone(task.inputParams),
    outputParamsSnapshot: null,
    xybotJobUuid: `mock-job-${Date.now()}`,
    cloudLogUrl: '#',
    cloudScreenUrl: '#',
  }
  state.executions.unshift(stripExecutionDetail(execution))
  state.executionDetails.unshift(execution)
  task.lastExecutionTime = execution.triggeredAt
  task.lastExecutionStatus = execution.status
  const boardRobot = state.boardRobots.find((item) => item.robotId === task.robotId)
  if (boardRobot) {
    boardRobot.executions.push({
      slotType: 'EXECUTION',
      executionId,
      taskId,
      taskName: task.name,
      appName: task.appName,
      startedAt: new Date().toISOString(),
      triggeredAt: new Date().toISOString(),
      status: 'RUNNING',
    })
  }
  return executionId
}

function stopExecution(state: MockState, executionId: string) {
  const execution = requireItem(state.executions.find((item) => item.executionId === executionId), '执行记录不存在')
  execution.status = 'STOPPED'
  execution.finishedAt = todayTime()
  const detail = state.executionDetails.find((item) => item.executionId === executionId)
  if (detail) {
    detail.status = 'STOPPED'
    detail.finishedAt = execution.finishedAt
  }
}

function retryExecution(state: MockState, executionId: string) {
  const original = requireItem(state.executionDetails.find((item) => item.executionId === executionId), '执行记录不存在')
  const retried: TaskExecutionDetailVO = {
    ...clone(original),
    executionId: `EXC-${Date.now()}`,
    triggeredAt: todayTime(),
    startedAt: todayTime(),
    finishedAt: null,
    status: 'RUNNING',
    durationSeconds: null,
    xybotJobUuid: `mock-job-${Date.now()}`,
  }
  state.executions.unshift(stripExecutionDetail(retried))
  state.executionDetails.unshift(retried)
  return stripExecutionDetail(retried)
}

function setResourceTags(state: MockState, body?: Record<string, unknown>, batch?: boolean) {
  const resourceType = String(body?.resourceType || '')
  const resourceIds = batch ? arrayParam(body?.resourceIds) : [String(body?.resourceId || '')]
  const tagIds = arrayParam(body?.tagIds)
  resourceIds.forEach((resourceId) => {
    const tags = tagObjects(state.tags, tagIds)
    if (resourceType === 'ACCOUNT') {
      const item = state.accounts.find((account) => account.accountId === resourceId)
      if (item) item.tags = clone(tags)
    }
    if (resourceType === 'RPA_APP') {
      const app = state.apps.find((item) => item.appId === resourceId)
      const detail = state.appDetails.find((item) => item.appId === resourceId)
      if (app) app.tags = clone(tags)
      if (detail) detail.tags = clone(tags)
    }
    if (resourceType === 'ROBOT') {
      const item = state.robots.find((robot) => robot.robotId === resourceId)
      if (item) item.tags = clone(tags)
    }
    if (resourceType === 'SCHEDULE_TASK') {
      const item = state.tasks.find((task) => task.taskId === resourceId)
      if (item) item.tags = clone(tags)
    }
  })
}

function stripExecutionDetail(detail: TaskExecutionDetailVO): TaskExecutionVO {
  return {
    executionId: detail.executionId,
    taskId: detail.taskId,
    taskName: detail.taskName,
    appId: detail.appId,
    appName: detail.appName,
    robotId: detail.robotId,
    robotName: detail.robotName,
    triggeredBy: detail.triggeredBy,
    triggerType: detail.triggerType,
    triggeredAt: detail.triggeredAt,
    startedAt: detail.startedAt,
    finishedAt: detail.finishedAt,
    durationSeconds: detail.durationSeconds,
    status: detail.status,
    errorMessage: detail.errorMessage,
    cloudLogUrl: detail.cloudLogUrl,
    cloudScreenUrl: detail.cloudScreenUrl,
  }
}

function tagObjects(tags: TagVO[], tagIds: string[]) {
  return tags.filter((tag) => tagIds.includes(tag.tagId)).map((tag) => ({
    tagId: tag.tagId,
    name: tag.name,
    color: tag.color,
  }))
}

function normalizePath(url: string) {
  return url.startsWith('http') ? new URL(url).pathname : url
}

function readParams(config?: AxiosRequestConfig) {
  const result: Record<string, unknown> = {}
  if (!config?.params) {
    return result
  }
  Object.entries(config.params as Record<string, unknown>).forEach(([key, value]) => {
    result[key] = value
  })
  return result
}

function arrayParam(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }
  if (typeof value === 'string' && value) {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

function numberParam(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function lower(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function requireItem<T>(value: T | undefined, message: string): T {
  if (value == null) {
    throw new Error(message)
  }
  return value
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function todayTime() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function extractUploadFileName(payload?: unknown) {
  if (payload instanceof FormData) {
    const file = payload.get('file')
    if (file && typeof file === 'object' && 'name' in file) {
      return String((file as { name: string }).name)
    }
  }
  return 'mock-upload.bin'
}
