<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppDrawer from '@/components/base/AppDrawer.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import PageHeader from '@/components/base/PageHeader.vue'
import StatusPill from '@/components/base/StatusPill.vue'
import { executionsApi } from '@/api/executions'
import { robotsApi } from '@/api/robots'
import { tagsApi } from '@/api/tags'
import { useToastStore } from '@/stores/toast'
import { robotStatusMeta, statusMeta } from '@/utils/format'
import type { BoardExecutionVO, BoardRobotVO, RobotGroupVO, TagVO } from '@/types/api'

type SelectedSlot = BoardExecutionVO & {
  robotId: string
  robotName: string
  groupName?: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

const toast = useToastStore()
const view = ref<'day' | 'week'>('day')
const selectedDate = ref(formatDateInput(new Date()))
const loading = ref(false)
const optionLoading = ref(false)
const robots = ref<BoardRobotVO[]>([])
const groups = ref<RobotGroupVO[]>([])
const tags = ref<TagVO[]>([])
const groupUuid = ref('')
const tagIds = ref<string[]>([])
const selectedSlot = ref<SelectedSlot | null>(null)

const range = computed(() => computeRange(selectedDate.value, view.value))
const axisCells = computed(() => buildAxisCells(range.value.start, view.value))
const sortedRobots = computed(() =>
  robots.value
    .slice()
    .sort((a, b) => {
      const groupCompare = (a.groupName || '').localeCompare(b.groupName || '', 'zh-Hans-CN')
      if (groupCompare !== 0) {
        return groupCompare
      }
      return a.robotName.localeCompare(b.robotName, 'zh-Hans-CN')
    }),
)
const currentLeft = computed(() => {
  const now = Date.now()
  if (now < range.value.start.getTime() || now >= range.value.end.getTime()) {
    return null
  }
  return ((now - range.value.start.getTime()) / (range.value.end.getTime() - range.value.start.getTime())) * 100
})
const rangeLabel = computed(() => formatRangeLabel(range.value.start, range.value.end, view.value))
const drawerTitle = computed(() => {
  if (!selectedSlot.value) {
    return '排班详情'
  }
  return selectedSlot.value.executionId || selectedSlot.value.taskName
})

async function loadBoard() {
  loading.value = true
  try {
    const res = await executionsApi.board({
      date: selectedDate.value,
      view: view.value,
      groupUuid: groupUuid.value || undefined,
      tagIds: tagIds.value.length ? tagIds.value : undefined,
    })
    robots.value = res.robots || []
  } catch {
    toast.show('排班看板加载失败', 'err')
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  optionLoading.value = true
  try {
    const [groupRes, tagRes] = await Promise.all([robotsApi.groups(), tagsApi.list()])
    groups.value = groupRes
    tags.value = tagRes
  } catch {
    toast.show('筛选项加载失败', 'err')
  } finally {
    optionLoading.value = false
  }
}

function goToday() {
  selectedDate.value = formatDateInput(new Date())
}

function shiftDate(delta: number) {
  const next = new Date(selectedDate.value)
  const offset = view.value === 'week' ? delta * 7 : delta
  next.setDate(next.getDate() + offset)
  selectedDate.value = formatDateInput(next)
}

function toggleTag(tagId: string) {
  if (tagIds.value.includes(tagId)) {
    tagIds.value = tagIds.value.filter((item) => item !== tagId)
    return
  }
  tagIds.value = [...tagIds.value, tagId]
}

function openSlot(robot: BoardRobotVO, slot: BoardExecutionVO) {
  selectedSlot.value = {
    ...slot,
    robotId: robot.robotId,
    robotName: robot.robotName,
    groupName: robot.groupName,
  }
}

function closeSlot() {
  selectedSlot.value = null
}

function slotTone(slot: BoardExecutionVO) {
  if (slot.slotType === 'SCHEDULED_SLOT') return 'sched'
  if (slot.status === 'RUNNING') return 'run'
  if (slot.status === 'FAILED') return 'err'
  if (slot.status === 'STOPPED' || slot.status === 'TIMEOUT') return 'warn'
  return 'ok'
}

function slotLabel(slot: BoardExecutionVO) {
  if (slot.slotType === 'SCHEDULED_SLOT') return '预排槽'
  if (slot.status === 'RUNNING') return '运行中'
  if (slot.status === 'FAILED') return '失败'
  if (slot.status === 'STOPPED') return '已停止'
  if (slot.status === 'TIMEOUT') return '超时'
  if (slot.status === 'SUCCESS') return '成功'
  return '执行'
}

function slotWindow(slot: BoardExecutionVO) {
  const startValue = slot.startedAt || slot.triggeredAt
  if (!startValue) {
    return null
  }
  const start = parseDateTime(startValue)
  if (!start) {
    return null
  }
  if (slot.slotType === 'SCHEDULED_SLOT') {
    const durationMinutes = slot.estimatedDurationMinutes || 60
    return { start, end: new Date(start.getTime() + durationMinutes * 60 * 1000) }
  }
  if (slot.finishedAt) {
    const end = parseDateTime(slot.finishedAt)
    return end ? { start, end } : null
  }
  if (slot.status === 'RUNNING') {
    return { start, end: new Date() }
  }
  const durationMinutes = slot.estimatedDurationMinutes || 60
  return { start, end: new Date(start.getTime() + durationMinutes * 60 * 1000) }
}

function slotStyle(slot: BoardExecutionVO) {
  const window = slotWindow(slot)
  if (!window) {
    return { display: 'none' }
  }
  const start = Math.max(window.start.getTime(), range.value.start.getTime())
  const end = Math.min(window.end.getTime(), range.value.end.getTime())
  if (end <= start) {
    return { display: 'none' }
  }
  const total = range.value.end.getTime() - range.value.start.getTime()
  const left = ((start - range.value.start.getTime()) / total) * 100
  const width = Math.max(((end - start) / total) * 100, slot.slotType === 'SCHEDULED_SLOT' ? 1.6 : 0.9)
  return { left: `${left}%`, width: `${width}%` }
}

function slotTimeText(slot: BoardExecutionVO) {
  const start = slot.startedAt || slot.triggeredAt
  const end = slot.finishedAt
  if (!start) return '-'
  if (slot.slotType === 'SCHEDULED_SLOT') {
    return `${formatDateTime(start)} · 预计 ${slot.estimatedDurationMinutes || 60}m`
  }
  if (end) {
    return `${formatDateTime(start)} - ${formatDateTime(end)}`
  }
  return `${formatDateTime(start)} - ${slot.status === 'RUNNING' ? '现在' : '未结束'}`
}

watch([view, selectedDate, groupUuid, () => tagIds.value.join(',')], () => {
  void loadBoard()
})

onMounted(async () => {
  await loadOptions()
  await loadBoard()
})

function computeRange(dateText: string, selectedView: 'day' | 'week') {
  const day = parseDateInput(dateText) || new Date()
  const start = selectedView === 'week' ? startOfWeek(day) : startOfDay(day)
  const end = new Date(start.getTime() + (selectedView === 'week' ? 7 : 1) * DAY_MS)
  return { start, end }
}

function buildAxisCells(start: Date, selectedView: 'day' | 'week') {
  if (selectedView === 'day') {
    return Array.from({ length: 24 }, (_, hour) => ({
      key: `h-${hour}`,
      label: `${String(hour).padStart(2, '0')}:00`,
      subLabel: hour === 0 ? formatDateInput(start) : '',
    }))
  }
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start.getTime() + index * DAY_MS)
    return {
      key: `d-${index}`,
      label: weekdayLabel(current),
      subLabel: formatDateInput(current),
    }
  })
}

function formatRangeLabel(start: Date, end: Date, selectedView: 'day' | 'week') {
  if (selectedView === 'day') {
    return `${formatDateLong(start)}`
  }
  const endDate = new Date(end.getTime() - DAY_MS)
  return `${formatDateLong(start)} - ${formatDateLong(endDate)}`
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateLong(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDateTime(value: string) {
  const date = parseDateTime(value)
  if (!date) return value
  return `${formatDateLong(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function parseDateInput(value: string) {
  const parts = value.split('-').map((item) => Number(item))
  if (parts.length !== 3 || parts.some((item) => Number.isNaN(item))) {
    return null
  }
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function parseDateTime(value: string) {
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed
  }
  const isoLike = value.replace(' ', 'T')
  const retry = new Date(isoLike)
  return Number.isNaN(retry.getTime()) ? null : retry
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfWeek(date: Date) {
  const day = startOfDay(date)
  const offset = (day.getDay() + 6) % 7
  day.setDate(day.getDate() - offset)
  return day
}

function weekdayLabel(date: Date) {
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const day = (date.getDay() + 6) % 7
  return labels[day]
}

</script>

<template>
  <section class="page">
    <PageHeader title="排班看板" subtitle="机器人调度时间轴">
      <div class="board-top-actions">
        <div class="board-nav">
          <BaseButton size="sm" @click="goToday">今天</BaseButton>
          <button class="board-nav-btn" type="button" @click="shiftDate(-1)">‹</button>
          <input v-model="selectedDate" class="board-date-input" type="date" />
          <button class="board-nav-btn" type="button" @click="shiftDate(1)">›</button>
        </div>
        <div class="board-tabs">
          <button class="board-tab" :class="{ active: view === 'day' }" type="button" @click="view = 'day'">日视图</button>
          <button class="board-tab" :class="{ active: view === 'week' }" type="button" @click="view = 'week'">周视图</button>
        </div>
        <BaseButton size="sm" :loading="loading" @click="loadBoard">刷新</BaseButton>
      </div>
    </PageHeader>

    <div class="board-toolbar">
      <div class="board-filter-row">
        <select v-model="groupUuid" class="fsel">
          <option value="">全部分组</option>
          <option v-for="group in groups" :key="group.xybotGroupUuid" :value="group.xybotGroupUuid">{{ group.name }}</option>
        </select>
        <div class="board-tags">
          <button
            v-for="tag in tags"
            :key="tag.tagId"
            class="board-tag-chip"
            :class="{ active: tagIds.includes(tag.tagId) }"
            type="button"
            @click="toggleTag(tag.tagId)"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>
      <div class="board-legend">
        <div class="legend-item"><span class="legend-box ok"></span>成功</div>
        <div class="legend-item"><span class="legend-box run"></span>运行中</div>
        <div class="legend-item"><span class="legend-box err"></span>失败</div>
        <div class="legend-item"><span class="legend-box warn"></span>已停止 / 超时</div>
        <div class="legend-item"><span class="legend-box sched"></span>预排时段</div>
      </div>
    </div>

    <div class="board-card">
      <div class="board-range">
        <div>
          <div class="board-range-title">{{ rangeLabel }}</div>
          <div class="board-range-sub">
            {{ view === 'day' ? '小时粒度' : '天粒度' }} · 当前共 {{ robots.length }} 台机器人
            <span v-if="optionLoading"> · 筛选项加载中</span>
          </div>
        </div>
        <div class="board-range-sub">点击色块可查看执行详情</div>
      </div>

      <div class="board-scroll">
        <div class="board-inner" :class="view">
          <div class="board-axis">
            <div class="board-axis-label">机器人</div>
            <div class="board-axis-grid" :class="view">
              <div v-for="cell in axisCells" :key="cell.key" class="board-axis-cell">
                <span>{{ cell.label }}</span>
                <small v-if="cell.subLabel">{{ cell.subLabel }}</small>
              </div>
            </div>
          </div>

          <template v-if="sortedRobots.length">
            <div v-for="robot in sortedRobots" :key="robot.robotId" class="board-row">
              <div class="board-robot">
                <div class="board-robot-head">
                  <div class="board-robot-name">{{ robot.robotName }}</div>
                  <StatusPill v-bind="robotStatusMeta(robot.status)" />
                </div>
                <div class="board-robot-meta">{{ robot.groupName || '未分组' }}</div>
              </div>
              <div class="board-timeline" :class="view">
                <div v-if="currentLeft != null" class="board-now" :style="{ left: `${currentLeft}%` }">
                  <span class="board-now-dot"></span>
                  <span class="board-now-label">现在</span>
                </div>
                <button
                  v-for="slot in robot.executions"
                  :key="`${robot.robotId}-${slot.executionId || slot.taskId}-${slot.startedAt || slot.triggeredAt}`"
                  type="button"
                  class="board-slot"
                  :class="slotTone(slot)"
                  :style="slotStyle(slot)"
                  @click="openSlot(robot, slot)"
                >
                  <span class="board-slot-content">
                    <span class="board-slot-title">{{ slot.taskName }}</span>
                    <span class="board-slot-sub">{{ slot.slotType === 'SCHEDULED_SLOT' ? '预排' : statusMeta(slot.status).label }}</span>
                  </span>
                  <span class="board-slot-hover-card">
                    <span class="board-slot-hover-head">
                      <span class="board-slot-hover-title">{{ slot.taskName }}</span>
                      <span class="board-slot-hover-badge">{{ slotLabel(slot) }}</span>
                    </span>
                    <span class="board-slot-hover-line">
                      <span class="board-slot-hover-k">应用</span>
                      <span class="board-slot-hover-v">{{ slot.appName || '-' }}</span>
                    </span>
                    <span class="board-slot-hover-line">
                      <span class="board-slot-hover-k">机器人</span>
                      <span class="board-slot-hover-v">{{ robot.robotName }}</span>
                    </span>
                    <span class="board-slot-hover-line">
                      <span class="board-slot-hover-k">时间</span>
                      <span class="board-slot-hover-v">{{ slotTimeText(slot) }}</span>
                    </span>
                  </span>
                </button>
                <div v-if="!robot.executions.length" class="board-empty-inline">暂无排班</div>
              </div>
            </div>
          </template>

          <div v-else class="board-empty">暂无排班数据</div>
        </div>
      </div>
    </div>

    <AppDrawer :open="!!selectedSlot" :title="drawerTitle" @close="closeSlot">
      <template v-if="selectedSlot">
        <div class="field">
          <label>任务名称</label>
          <div>{{ selectedSlot.taskName }}</div>
        </div>
        <div class="field">
          <label>应用名称</label>
          <div>{{ selectedSlot.appName }}</div>
        </div>
        <div class="field">
          <label>机器人</label>
          <div>{{ selectedSlot.robotName }}</div>
        </div>
        <div class="field">
          <label>所属分组</label>
          <div>{{ selectedSlot.groupName || '未分组' }}</div>
        </div>
        <div class="field form-grid-2">
          <div>
            <label>类型</label>
            <div>{{ slotLabel(selectedSlot) }}</div>
          </div>
          <div>
            <label>状态</label>
            <StatusPill v-if="selectedSlot.slotType === 'EXECUTION'" v-bind="statusMeta(selectedSlot.status)" />
            <StatusPill v-else label="预排" tone="off" />
          </div>
        </div>
        <div class="field">
          <label>时间</label>
          <div class="cm">{{ slotTimeText(selectedSlot) }}</div>
        </div>
        <div class="field" v-if="selectedSlot.executionId">
          <label>执行 ID</label>
          <div class="cmono">{{ selectedSlot.executionId }}</div>
        </div>
      </template>
      <template #footer>
        <BaseButton @click="closeSlot">关闭</BaseButton>
      </template>
    </AppDrawer>
  </section>
</template>
