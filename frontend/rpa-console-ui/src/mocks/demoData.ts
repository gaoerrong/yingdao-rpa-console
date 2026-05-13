import type {
  AccountVO,
  BoardRobotVO,
  DepartmentVO,
  RpaAppDetailVO,
  RpaAppVO,
  RobotGroupVO,
  RobotVO,
  ScheduleTaskVO,
  TagVO,
  TaskExecutionDetailVO,
  TaskExecutionVO,
  TenantVO,
} from '@/types/api'

export const tenants: TenantVO[] = [
  { tenantId: 'tenant-001', name: '华东子公司', description: '制造业事业群', status: 'ACTIVE', deptCount: 4, accountCount: 23, createdAt: '2026-01-10' },
  { tenantId: 'tenant-002', name: '华北子公司', description: '政务数字化事业群', status: 'ACTIVE', deptCount: 3, accountCount: 18, createdAt: '2026-01-15' },
  { tenantId: 'tenant-003', name: '华南子公司', description: '供应链事业群', status: 'ACTIVE', deptCount: 2, accountCount: 11, createdAt: '2026-02-01' },
  { tenantId: 'tenant-000', name: '总部', description: '集团总部', status: 'ACTIVE', deptCount: 2, accountCount: 5, createdAt: '2026-01-01' },
]

export const departments: DepartmentVO[] = [
  { deptId: 'dept-t001-001', tenantId: 'tenant-001', name: '财务部', description: '财务凭证录入与报表自动化', accountCount: 8, createdAt: '2026-01-10' },
  { deptId: 'dept-t001-002', tenantId: 'tenant-001', name: '销售部', description: '订单同步与客户数据自动化', accountCount: 6, createdAt: '2026-01-10' },
  { deptId: 'dept-t001-003', tenantId: 'tenant-001', name: '采购部', description: '采购订单核对与供应商数据同步', accountCount: 5, createdAt: '2026-02-05' },
  { deptId: 'dept-t001-004', tenantId: 'tenant-001', name: '行政部', description: '行政通知与档案管理自动化', accountCount: 4, createdAt: '2026-02-20' },
]

export const tags = [
  { tagId: 'tag-finance', name: '财务', color: '#22c55e', description: '财务自动化', accountCount: 4, appCount: 2, robotCount: 3, taskCount: 5, createdAt: '2026-01-15', createdByName: '张伟' },
  { tagId: 'tag-audit', name: '审计', color: '#f59e0b', description: '审计流程', accountCount: 2, appCount: 0, robotCount: 1, taskCount: 2, createdAt: '2026-01-15', createdByName: '张伟' },
  { tagId: 'tag-sales', name: '销售', color: '#3b82f6', description: '销售数据', accountCount: 1, appCount: 1, robotCount: 2, taskCount: 3, createdAt: '2026-02-08', createdByName: '李明' },
  { tagId: 'tag-hr', name: 'HR', color: '#22c55e', description: '人力流程', accountCount: 2, appCount: 1, robotCount: 1, taskCount: 2, createdAt: '2026-02-20', createdByName: '王芳' },
  { tagId: 'tag-legal', name: '法务', color: '#6b7280', description: '法务与合规', accountCount: 1, appCount: 1, robotCount: 1, taskCount: 0, createdAt: '2026-03-01', createdByName: '陈静' },
  { tagId: 'tag-purchase', name: '采购', color: '#f59e0b', description: '采购流程', accountCount: 1, appCount: 0, robotCount: 1, taskCount: 1, createdAt: '2026-03-12', createdByName: '刘洋' },
] satisfies TagVO[]

const t = (name: string) => tags.find((tag) => tag.name === name)!

export const accounts: AccountVO[] = [
  { accountId: 'acc-001', name: '张伟', loginAccount: 'zhang.wei', phone: '138****8001', tenantName: '华东子公司', deptName: '财务部', consoleRole: 'MEMBER', status: 'ACTIVE', tags: [t('财务'), t('审计')], syncedAt: '2026-05-09T14:00:12' },
  { accountId: 'acc-002', name: '李明', loginAccount: 'li.ming', phone: '139****0042', tenantName: '华东子公司', deptName: null, consoleRole: 'TENANT_ADMIN', status: 'ACTIVE', tags: [t('销售')], syncedAt: '2026-05-09T14:00:12' },
  { accountId: 'acc-003', name: '王芳', loginAccount: 'wang.fang', phone: '137****5509', tenantName: '华北子公司', deptName: '人事部', consoleRole: 'MEMBER', status: 'ACTIVE', tags: [t('HR')], syncedAt: '2026-05-09T14:00:12' },
  { accountId: 'acc-004', name: '超级管理员', loginAccount: 'admin@ydcs', phone: '系统账号', tenantName: null, deptName: null, consoleRole: 'SUPER_ADMIN', status: 'ACTIVE', tags: [], syncedAt: '2026-05-09T14:00:12' },
  { accountId: 'acc-005', name: '陈静', loginAccount: 'chen.jing', phone: '135****7731', tenantName: '总部', deptName: '法务部', consoleRole: 'MEMBER', status: 'EXPIRED', tags: [t('法务')], syncedAt: '2026-05-09T14:00:12' },
  { accountId: 'acc-006', name: '赵磊', loginAccount: 'zhao.lei', phone: '136****2214', tenantName: '华北子公司', deptName: '行政部', consoleRole: 'MEMBER', status: 'ACTIVE', tags: [t('审计')], syncedAt: '2026-05-09T14:00:12' },
  { accountId: 'acc-007', name: '刘洋', loginAccount: 'liu.yang', phone: '180****8803', tenantName: '华南子公司', deptName: '采购部', consoleRole: 'MEMBER', status: 'ACTIVE', tags: [t('采购')], syncedAt: '2026-05-09T14:00:12' },
]

export const apps: RpaAppVO[] = [
  { appId: 'app-001', appUuid: 'app-uuid-f001', name: '财务凭证处理', version: 'v2.1', supportParam: true, ownerName: 'zhang.wei', tenantMappings: [{ mappingId: 'm1', tenantId: 'tenant-001', tenantName: '华东子公司', deptId: 'dept-t001-001', deptName: '财务部' }], tags: [t('财务')], status: 'ACTIVE', syncedAt: '2026-05-09T14:05:32' },
  { appId: 'app-002', appUuid: 'app-uuid-s002', name: '订单管理系统同步', version: 'v1.5', supportParam: true, ownerName: 'li.ming', tenantMappings: [{ mappingId: 'm2', tenantId: 'tenant-001', tenantName: '华东子公司', deptId: 'dept-t001-002', deptName: '销售部' }], tags: [t('销售')], status: 'ACTIVE', syncedAt: '2026-05-09T14:05:32' },
  { appId: 'app-003', appUuid: 'app-uuid-r003', name: '月报生成器', version: 'v1.3', supportParam: true, ownerName: 'wang.fang', tenantMappings: [{ mappingId: 'm3', tenantId: 'tenant-002', tenantName: '华北子公司', deptName: '人事部' }], tags: [t('HR')], status: 'ACTIVE', syncedAt: '2026-05-09T14:05:32' },
  { appId: 'app-004', appUuid: 'app-uuid-c004', name: '合同管理应用', version: 'v3.0', supportParam: false, ownerName: 'chen.jing', tenantMappings: [{ mappingId: 'm4', tenantId: 'tenant-000', tenantName: '总部', deptName: '法务部' }], tags: [t('法务')], status: 'ACTIVE', syncedAt: '2026-05-09T14:05:32' },
  { appId: 'app-005', appUuid: 'app-uuid-e005', name: '旧版邮件通知', version: 'v0.9', supportParam: false, ownerName: 'zhao.lei', tenantMappings: [], tags: [], status: 'EXPIRED', syncedAt: '2026-05-09T14:05:32' },
]

export const appDetails: RpaAppDetailVO[] = apps.map((app) => ({
  ...app,
  description: `${app.name} 参数定义`,
  inputParams: app.supportParam ? [
    { name: 'file_path', type: 'file', value: null, description: '输入文件或模板文件', direction: 'In', required: true },
    { name: 'sheet_index', type: 'float', value: 1, description: '工作表编号', direction: 'In' },
    { name: 'enable_backup', type: 'bool', value: true, description: '执行前备份', direction: 'In' },
  ] : [],
  outputParams: app.supportParam ? [{ name: 'result_count', type: 'float', description: '处理数量', direction: 'Out' }] : [],
}))

export const robots: RobotVO[] = [
  { robotId: 'robot-001', xybotRobotClientUuid: 'client-f001', name: '财务-机器人01', accountName: 'zhang.wei', tenantName: '华东子公司', deptName: '财务部', groupUuid: 'grp-fin', groupName: '财务自动化组', status: 'ONLINE', clientIp: '192.168.1.101', currentAppName: null, lastHeartbeat: '15:42:03', tags: [t('财务')], syncedAt: '2026-05-09T15:42:03' },
  { robotId: 'robot-002', xybotRobotClientUuid: 'client-s003', name: '销售部-机器人03', accountName: 'li.ming', tenantName: '华东子公司', deptName: '销售部', groupUuid: 'grp-sales', groupName: '销售自动化组', status: 'BUSY', clientIp: '192.168.3.22', currentAppName: '订单管理系统同步', lastHeartbeat: '15:41:58', tags: [t('销售')], syncedAt: '2026-05-09T15:41:58' },
  { robotId: 'robot-003', xybotRobotClientUuid: 'client-h002', name: 'HR部-机器人02', accountName: 'wang.fang', tenantName: '华北子公司', deptName: '人事部', groupUuid: 'grp-hr', groupName: 'HR自动化组', status: 'OFFLINE', clientIp: '192.168.2.35', currentAppName: null, lastHeartbeat: '08:15:42', tags: [t('HR')], syncedAt: '2026-05-09T08:15:42' },
  { robotId: 'robot-004', xybotRobotClientUuid: 'client-a001', name: '行政部-机器人01', accountName: 'zhao.lei', tenantName: '华北子公司', deptName: '行政部', groupUuid: 'grp-admin', groupName: '行政自动化组', status: 'ONLINE', clientIp: '192.168.4.88', currentAppName: null, lastHeartbeat: '15:40:11', tags: [t('审计')], syncedAt: '2026-05-09T15:40:11' },
  { robotId: 'robot-005', xybotRobotClientUuid: 'client-l001', name: '法务部-机器人01', accountName: 'chen.jing', tenantName: '总部', deptName: '法务部', groupUuid: 'grp-legal', groupName: '法务自动化组', status: 'ONLINE', clientIp: '192.168.5.14', currentAppName: null, lastHeartbeat: '15:38:55', tags: [t('法务')], syncedAt: '2026-05-09T15:38:55' },
  { robotId: 'robot-006', xybotRobotClientUuid: 'client-p002', name: '采购部-机器人02', accountName: 'liu.yang', tenantName: '华南子公司', deptName: '采购部', groupUuid: 'grp-purchase', groupName: '采购自动化组', status: 'ONLINE', clientIp: '192.168.6.201', currentAppName: null, lastHeartbeat: '15:36:29', tags: [t('采购')], syncedAt: '2026-05-09T15:36:29' },
]

export const robotGroups: RobotGroupVO[] = [
  { groupId: 'g1', xybotGroupUuid: 'grp-fin', name: '财务自动化组' },
  { groupId: 'g2', xybotGroupUuid: 'grp-sales', name: '销售自动化组' },
  { groupId: 'g3', xybotGroupUuid: 'grp-hr', name: 'HR自动化组' },
]

export const tasks: ScheduleTaskVO[] = [
  { taskId: 'task-001', name: '财务凭证自动录入', appId: 'app-001', appName: '财务凭证处理 v2.1', robotId: 'robot-001', robotName: '财务-机器人01', scheduleType: 'CRON', cronExpr: '每天 09:00', priority: '200', status: 'ENABLED', lastExecutionTime: '05-09 09:02', lastExecutionStatus: 'SUCCESS', tags: [t('财务')], createdBy: 'acc-001', createdByName: '张伟', createdAt: '2026-02-01' },
  { taskId: 'task-002', name: '订单状态实时同步', appId: 'app-002', appName: '订单管理系统同步', groupUuid: 'grp-sales', groupName: '销售部-RPA集群', scheduleType: 'CRON', cronExpr: '每30分钟', priority: '100', status: 'ENABLED', lastExecutionTime: '05-09 14:30', lastExecutionStatus: 'RUNNING', tags: [t('销售')], createdBy: 'system', createdByName: '系统', createdAt: '2026-02-08' },
  { taskId: 'task-003', name: '月度报表自动导出', appId: 'app-003', appName: '月报生成器 v1.3', robotId: 'robot-003', robotName: 'HR部-机器人02', scheduleType: 'IMMEDIATE', cronExpr: null, priority: '0', status: 'ENABLED', lastExecutionTime: '05-08 23:05', lastExecutionStatus: 'FAILED', tags: [t('HR')], createdBy: 'acc-002', createdByName: '李明', createdAt: '2026-02-20' },
  { taskId: 'task-004', name: '员工邮件批量通知', appId: 'app-005', appName: '邮件通知服务', robotId: 'robot-004', robotName: '行政部-机器人01', scheduleType: 'CRON', cronExpr: '每天 18:00', priority: '0', status: 'DISABLED', lastExecutionTime: null, lastExecutionStatus: null, tags: [t('审计')], createdBy: 'acc-006', createdByName: '赵磊', createdAt: '2026-03-01' },
  { taskId: 'task-005', name: '合同信息智能提取', appId: 'app-004', appName: '合同管理应用 v3.0', robotId: 'robot-005', robotName: '法务部-机器人01', scheduleType: 'CRON', cronExpr: '每周一 08:00', priority: '100', status: 'ENABLED', lastExecutionTime: '05-06 08:02', lastExecutionStatus: 'SUCCESS', tags: [t('法务')], createdBy: 'acc-005', createdByName: '王芳', createdAt: '2026-03-02' },
  { taskId: 'task-006', name: '采购订单数据核对', appId: 'app-001', appName: '采购核对 v1.0', robotId: 'robot-006', robotName: '采购部-机器人02', scheduleType: 'CRON', cronExpr: '每天 07:30', priority: '200', status: 'ENABLED', lastExecutionTime: '05-09 07:31', lastExecutionStatus: 'SUCCESS', tags: [t('采购')], createdBy: 'acc-007', createdByName: '刘洋', createdAt: '2026-03-12' },
]

export const executions: TaskExecutionVO[] = [
  { executionId: 'EXC-20260509-001', taskId: 'task-001', taskName: '财务凭证自动录入', appId: 'app-001', appName: '财务凭证处理 v2.1', robotName: '财务-机器人01', triggeredBy: '张伟', triggerType: 'MANUAL', triggeredAt: '05-09 09:00:05', startedAt: '05-09 09:00:12', finishedAt: '05-09 09:02:46', durationSeconds: 154, status: 'SUCCESS', cloudLogUrl: '#', cloudScreenUrl: '#' },
  { executionId: 'EXC-20260509-002', taskId: 'task-002', taskName: '订单状态实时同步', appId: 'app-002', appName: '订单管理系统同步', robotName: '销售部-机器人03', triggeredBy: '系统', triggerType: 'SCHEDULED', triggeredAt: '05-09 14:30:01', startedAt: '05-09 14:30:08', finishedAt: null, durationSeconds: null, status: 'RUNNING' },
  { executionId: 'EXC-20260508-018', taskId: 'task-003', taskName: '月度报表自动导出', appId: 'app-003', appName: '月报生成器 v1.3', robotName: 'HR部-机器人02', triggeredBy: '李明', triggerType: 'MANUAL', triggeredAt: '05-08 23:05:02', startedAt: '05-08 23:05:09', finishedAt: '05-08 23:06:14', durationSeconds: 72, status: 'FAILED', errorMessage: '数据源连接超时：ConnectionTimeoutError (timeout: 30s)' },
  { executionId: 'EXC-20260509-003', taskId: 'task-001', taskName: '财务凭证自动录入', appId: 'app-001', appName: '财务凭证处理 v2.1', robotName: '财务-机器人01', triggeredBy: '系统', triggerType: 'SCHEDULED', triggeredAt: '05-09 09:00:02', startedAt: '05-09 09:00:10', finishedAt: '05-09 09:02:02', durationSeconds: 112, status: 'SUCCESS', cloudLogUrl: '#' },
  { executionId: 'EXC-20260506-009', taskId: 'task-005', taskName: '合同信息智能提取', appId: 'app-004', appName: '合同管理应用 v3.0', robotName: '法务部-机器人01', triggeredBy: '王芳', triggerType: 'MANUAL', triggeredAt: '05-06 08:02:17', startedAt: '05-06 08:02:20', finishedAt: '05-06 08:07:38', durationSeconds: 318, status: 'SUCCESS' },
]

export const executionDetails: TaskExecutionDetailVO[] = executions.map((item) => ({
  ...item,
  inputParamsSnapshot: [
    { name: 'file_path', type: 'str', value: '/data/finance/2026-05.xlsx', direction: 'In' },
    { name: 'sheet_index', type: 'float', value: '1', direction: 'In' },
  ],
  outputParamsSnapshot: item.status === 'SUCCESS' ? [{ name: 'result_count', type: 'float', value: 47, direction: 'Out' }] : null,
  xybotJobUuid: `job-${item.executionId.toLowerCase()}`,
}))

export const boardRobots: BoardRobotVO[] = [
  { robotId: 'robot-001', robotName: '财务-机器人01', status: 'ONLINE', groupName: '财务自动化组', executions: [
    { slotType: 'EXECUTION', executionId: 'EXC-20260509-001', taskId: 'task-001', taskName: '财务凭证录入', appName: '财务凭证处理', startedAt: '2026-05-09T09:00:00', finishedAt: '2026-05-09T11:36:00', status: 'SUCCESS' },
    { slotType: 'EXECUTION', executionId: 'EXC-20260509-003', taskId: 'task-001', taskName: '财务凭证录入', appName: '财务凭证处理', startedAt: '2026-05-09T12:30:00', finishedAt: '2026-05-09T15:42:00', status: 'SUCCESS' },
  ] },
  { robotId: 'robot-002', robotName: '销售部-机器人03', status: 'BUSY', groupName: '销售自动化组', executions: [
    { slotType: 'EXECUTION', executionId: 'EXC-20260509-002', taskId: 'task-002', taskName: '订单状态实时同步', appName: '订单管理系统同步', startedAt: '2026-05-09T14:30:00', finishedAt: null, estimatedDurationMinutes: 180, status: 'RUNNING' },
  ] },
  { robotId: 'robot-003', robotName: 'HR部-机器人02', status: 'OFFLINE', groupName: 'HR自动化组', executions: [
    { slotType: 'EXECUTION', executionId: 'EXC-20260508-018', taskId: 'task-003', taskName: '月报导出', appName: '月报生成器', startedAt: '2026-05-09T23:05:00', finishedAt: '2026-05-09T23:48:00', status: 'FAILED' },
  ] },
  { robotId: 'robot-004', robotName: '行政部-机器人01', status: 'ONLINE', groupName: '行政自动化组', executions: [
    { slotType: 'SCHEDULED_SLOT', taskId: 'task-004', taskName: '员工通知', appName: '邮件通知服务', startedAt: '2026-05-09T18:00:00', finishedAt: null, estimatedDurationMinutes: 54, status: null },
  ] },
  { robotId: 'robot-005', robotName: '法务部-机器人01', status: 'ONLINE', groupName: '法务自动化组', executions: [
    { slotType: 'EXECUTION', executionId: 'EXC-20260506-009', taskId: 'task-005', taskName: '合同信息提取', appName: '合同管理应用', startedAt: '2026-05-09T08:02:00', finishedAt: '2026-05-09T13:20:00', status: 'SUCCESS' },
  ] },
]
