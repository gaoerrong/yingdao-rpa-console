import type { ConsoleRole, ExecutionStatus, Priority, RobotStatus, TaskStatus, TenantStatus } from '@/types/api'

export function roleMeta(role: ConsoleRole) {
  return role === 'SUPER_ADMIN'
    ? { label: '超级管理员', tone: 'sa' as const }
    : role === 'TENANT_ADMIN'
      ? { label: '租户管理员', tone: 'ta' as const }
      : { label: '员工', tone: 'mb' as const }
}

export function statusMeta(status?: ExecutionStatus | null) {
  const map = {
    RUNNING: { label: '运行中', tone: 'run' as const, blink: true },
    SUCCESS: { label: '成功', tone: 'ok' as const, blink: false },
    FAILED: { label: '失败', tone: 'err' as const, blink: false },
    STOPPED: { label: '已停止', tone: 'warn' as const, blink: false },
    TIMEOUT: { label: '超时', tone: 'warn' as const, blink: false },
  }
  return status ? map[status] : { label: '未执行', tone: 'off' as const, blink: false }
}

export function taskStatusMeta(status: TaskStatus) {
  return status === 'ENABLED' ? { label: '启用', tone: 'en' as const } : { label: '停用', tone: 'dis' as const }
}

export function tenantStatusMeta(status: TenantStatus) {
  return status === 'ACTIVE' ? { label: '启用', tone: 'en' as const } : { label: '停用', tone: 'dis' as const }
}

export function robotStatusMeta(status: RobotStatus) {
  const map = {
    ONLINE: { label: '在线', tone: 'ok' as const, blink: false },
    OFFLINE: { label: '离线', tone: 'off' as const, blink: false },
    BUSY: { label: '忙碌', tone: 'run' as const, blink: true },
  }
  return map[status]
}

export function priorityMeta(priority: Priority) {
  const map = {
    '0': { label: '低', tone: 'lo' as const },
    '100': { label: '中', tone: 'mid' as const },
    '200': { label: '高', tone: 'hi' as const },
  }
  return map[priority]
}

export function duration(seconds?: number | null) {
  if (!seconds) return '-'
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`
}

export function tagClass(index: number) {
  return ['tg', 'to', '', 'tb', 'tgr', 'tv'][index % 6]
}
