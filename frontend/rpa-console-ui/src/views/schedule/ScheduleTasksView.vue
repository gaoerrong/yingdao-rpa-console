<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import PageHeader from '@/components/base/PageHeader.vue'
import PaginationBar from '@/components/base/PaginationBar.vue'
import SearchToolbar from '@/components/base/SearchToolbar.vue'
import StatusPill from '@/components/base/StatusPill.vue'
import WizardModal from '@/components/base/WizardModal.vue'
import { filesApi } from '@/api/files'
import { rpaAppsApi } from '@/api/rpaApps'
import { robotsApi } from '@/api/robots'
import { scheduleApi } from '@/api/schedule'
import { tagsApi } from '@/api/tags'
import { useToastStore } from '@/stores/toast'
import { priorityMeta, statusMeta, tagClass, taskStatusMeta } from '@/utils/format'
import type {
  AppParam,
  CreateScheduleTaskRequest,
  PageResult,
  Priority,
  RobotGroupVO,
  RobotVO,
  RpaAppDetailVO,
  RpaAppVO,
  ScheduleTaskDetailVO,
  ScheduleTaskVO,
  TagVO,
  TaskStatus,
} from '@/types/api'

type RobotMode = 'ROBOT' | 'GROUP'
type RuleMode = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM_CRON'

interface TaskInputParam extends AppParam {
  fileName?: string | null
  uploading?: boolean
}

interface TaskFormState {
  name: string
  description: string
  tagIds: string[]
  appId: string
  inputParams: TaskInputParam[]
  robotId: string | null
  groupUuid: string | null
  executeScope: 'any' | 'all' | null
  scheduleType: 'IMMEDIATE' | 'CRON'
  cronExpr: string
  validFrom: string | null
  validTo: string | null
  priority: Priority
  runTimeoutSeconds: number | null
  waitTimeoutSeconds: number | null
  retryTimes: number
  enableCloudLog: boolean
  enableCloudScreen: boolean
  callbackUrl: string
}

const WEEK_OPTIONS = [
  { label: '周一', value: 'MON' },
  { label: '周二', value: 'TUE' },
  { label: '周三', value: 'WED' },
  { label: '周四', value: 'THU' },
  { label: '周五', value: 'FRI' },
  { label: '周六', value: 'SAT' },
  { label: '周日', value: 'SUN' },
]

const toast = useToastStore()
const keyword = ref('')
const rows = ref<ScheduleTaskVO[]>([])
const pagination = ref<Pick<PageResult<ScheduleTaskVO>, 'total' | 'current' | 'size'>>({
  total: 0,
  current: 1,
  size: 10,
})
const apps = ref<RpaAppVO[]>([])
const robots = ref<RobotVO[]>([])
const groups = ref<RobotGroupVO[]>([])
const tags = ref<TagVO[]>([])
const loading = ref(false)
const actionLoadingId = ref('')
const optionsLoading = ref(false)
const appLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const modalOpen = ref(false)
const submitting = ref(false)
const step = ref(1)
const editingTaskId = ref<string | null>(null)
const robotMode = ref<RobotMode>('ROBOT')
const ruleMode = ref<RuleMode>('DAILY')
const dailyTime = ref('09:00')
const weeklyDay = ref('MON')
const monthlyDay = ref(1)
const cronInput = ref('')
const appDetail = ref<RpaAppDetailVO | null>(null)

const stepTitles = [
  '步骤 1/5 · 基本信息',
  '步骤 2/5 · 选择应用 + 配置参数',
  '步骤 3/5 · 选择机器人',
  '步骤 4/5 · 调度策略',
  '步骤 5/5 · 高级配置',
]

const defaultForm = (): TaskFormState => ({
  name: '',
  description: '',
  tagIds: [],
  appId: '',
  inputParams: [],
  robotId: null,
  groupUuid: null,
  executeScope: null,
  scheduleType: 'IMMEDIATE',
  cronExpr: '',
  validFrom: null,
  validTo: null,
  priority: '100',
  runTimeoutSeconds: null,
  waitTimeoutSeconds: null,
  retryTimes: 0,
  enableCloudLog: false,
  enableCloudScreen: false,
  callbackUrl: '',
})

const form = ref<TaskFormState>(defaultForm())

const selectedApp = computed(() => apps.value.find((item) => item.appId === form.value.appId) || null)
const selectedRobot = computed(() => robots.value.find((item) => item.robotId === form.value.robotId) || null)
const selectedGroup = computed(() => groups.value.find((item) => item.xybotGroupUuid === form.value.groupUuid) || null)
const schedulePreview = computed(() => {
  if (form.value.scheduleType === 'IMMEDIATE') return '保存后通过“立即触发”手动执行'
  const expr = buildCronExpr()
  return expr || '请完善定时规则'
})

function parseTime(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  return {
    hour: Number.isFinite(hour) ? hour : 9,
    minute: Number.isFinite(minute) ? minute : 0,
  }
}

function buildCronExpr() {
  const { hour, minute } = parseTime(dailyTime.value || '09:00')
  if (form.value.scheduleType === 'IMMEDIATE') return ''
  if (ruleMode.value === 'DAILY') return `0 ${minute} ${hour} * * ?`
  if (ruleMode.value === 'WEEKLY') return `0 ${minute} ${hour} ? * ${weeklyDay.value}`
  if (ruleMode.value === 'MONTHLY') return `0 ${minute} ${hour} ${monthlyDay.value} * ?`
  return cronInput.value.trim()
}

function applyRuleFromCron(cronExpr?: string | null) {
  if (!cronExpr) {
    ruleMode.value = 'DAILY'
    dailyTime.value = '09:00'
    weeklyDay.value = 'MON'
    monthlyDay.value = 1
    cronInput.value = ''
    return
  }
  cronInput.value = cronExpr
  const dailyMatch = cronExpr.match(/^0\s+(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\?$/)
  if (dailyMatch) {
    ruleMode.value = 'DAILY'
    dailyTime.value = `${dailyMatch[2].padStart(2, '0')}:${dailyMatch[1].padStart(2, '0')}`
    return
  }
  const weeklyMatch = cronExpr.match(/^0\s+(\d{1,2})\s+(\d{1,2})\s+\?\s+\*\s+([A-Z]{3})$/)
  if (weeklyMatch) {
    ruleMode.value = 'WEEKLY'
    dailyTime.value = `${weeklyMatch[2].padStart(2, '0')}:${weeklyMatch[1].padStart(2, '0')}`
    weeklyDay.value = weeklyMatch[3]
    return
  }
  const monthlyMatch = cronExpr.match(/^0\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+\*\s+\?$/)
  if (monthlyMatch) {
    ruleMode.value = 'MONTHLY'
    dailyTime.value = `${monthlyMatch[2].padStart(2, '0')}:${monthlyMatch[1].padStart(2, '0')}`
    monthlyDay.value = Number(monthlyMatch[3])
    return
  }
  ruleMode.value = 'CUSTOM_CRON'
}

function mapSavedParams(inputParams: TaskInputParam[]) {
  return new Map(inputParams.map((item) => [item.name, item]))
}

function mergeAppParams(definitions: AppParam[], savedParams: TaskInputParam[]) {
  const savedMap = mapSavedParams(savedParams)
  return definitions.map((param) => {
    const saved = savedMap.get(param.name)
    return {
      ...param,
      value: saved?.value ?? param.value ?? '',
      fileName: saved?.fileName ?? null,
      uploading: false,
    }
  })
}

async function loadTasks() {
  loading.value = true
  try {
    const res = await scheduleApi.list({
      page: pagination.value.current,
      size: pagination.value.size,
      name: keyword.value.trim() || undefined,
    })
    rows.value = res.records
    pagination.value = {
      total: res.total,
      current: res.current,
      size: res.size,
    }
  } catch {
    toast.show('调度任务加载失败', 'err')
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  optionsLoading.value = true
  try {
    const [appsRes, robotsRes, groupsRes, tagsRes] = await Promise.all([
      rpaAppsApi.list({ page: 1, size: 200 }),
      robotsApi.list({ page: 1, size: 200 }),
      robotsApi.groups(),
      tagsApi.list(),
    ])
    apps.value = appsRes.records
    robots.value = robotsRes.records
    groups.value = groupsRes
    tags.value = tagsRes
  } catch {
    toast.show('任务配置选项加载失败', 'err')
  } finally {
    optionsLoading.value = false
  }
}

function resetForm() {
  form.value = defaultForm()
  step.value = 1
  editingTaskId.value = null
  robotMode.value = 'ROBOT'
  appDetail.value = null
  applyRuleFromCron(null)
}

function closeModal() {
  modalOpen.value = false
}

function openCreate() {
  resetForm()
  modalOpen.value = true
}

async function loadAppDetail(appId: string, savedParams: TaskInputParam[] = []) {
  if (!appId) {
    appDetail.value = null
    form.value.inputParams = []
    return
  }
  appLoading.value = true
  try {
    const detail = await rpaAppsApi.detail(appId)
    appDetail.value = detail
    form.value.inputParams = mergeAppParams(detail.inputParams || [], savedParams)
  } catch {
    appDetail.value = null
    form.value.inputParams = []
    toast.show('应用参数加载失败', 'err')
  } finally {
    appLoading.value = false
  }
}

async function handleAppChange() {
  const savedParams = form.value.inputParams
  await loadAppDetail(form.value.appId, savedParams)
}

async function openEdit(taskId: string) {
  resetForm()
  editingTaskId.value = taskId
  modalOpen.value = true
  try {
    const detail = await scheduleApi.detail(taskId)
    fillForm(detail)
    await loadAppDetail(detail.appId, detail.inputParams as TaskInputParam[])
  } catch {
    toast.show('任务详情加载失败', 'err')
    modalOpen.value = false
  }
}

function fillForm(detail: ScheduleTaskDetailVO) {
  form.value = {
    name: detail.name,
    description: detail.description || '',
    tagIds: detail.tags.map((item) => item.tagId),
    appId: detail.appId,
    inputParams: (detail.inputParams || []) as TaskInputParam[],
    robotId: detail.robotId || null,
    groupUuid: detail.groupUuid || null,
    executeScope: detail.executeScope || null,
    scheduleType: detail.scheduleType,
    cronExpr: detail.cronExpr || '',
    validFrom: detail.validFrom ? detail.validFrom.slice(0, 10) : null,
    validTo: detail.validTo ? detail.validTo.slice(0, 10) : null,
    priority: detail.priority,
    retryTimes: detail.retryTimes ?? 0,
    runTimeoutSeconds: detail.runTimeoutSeconds ?? null,
    waitTimeoutSeconds: detail.waitTimeoutSeconds ?? null,
    enableCloudLog: detail.enableCloudLog,
    enableCloudScreen: detail.enableCloudScreen,
    callbackUrl: detail.callbackUrl || '',
  }
  robotMode.value = detail.groupUuid ? 'GROUP' : 'ROBOT'
  applyRuleFromCron(detail.cronExpr)
}

function validateStepOne() {
  if (!form.value.name.trim()) {
    toast.show('请填写任务名称', 'err')
    return false
  }
  if (form.value.name.trim().length > 50) {
    toast.show('任务名称不能超过 50 字', 'err')
    return false
  }
  return true
}

function validateStepTwo() {
  if (!form.value.appId) {
    toast.show('请选择应用', 'err')
    return false
  }
  const requiredParams = form.value.inputParams.filter(
    (item) => item.direction !== 'Out' && item.required === true,
  )
  const invalid = requiredParams.find((item) => {
    if (item.type === 'bool') return item.value === undefined || item.value === null || item.value === ''
    return `${item.value ?? ''}`.trim() === ''
  })
  if (invalid) {
    toast.show(`请填写必填参数：${invalid.name}`, 'err')
    return false
  }
  return true
}

function validateStepThree() {
  if (robotMode.value === 'ROBOT') {
    if (!form.value.robotId) {
      toast.show('请选择执行机器人', 'err')
      return false
    }
    form.value.groupUuid = null
    form.value.executeScope = null
    return true
  }
  if (!form.value.groupUuid) {
    toast.show('请选择机器人分组', 'err')
    return false
  }
  if (!form.value.executeScope) {
    toast.show('请选择分组执行范围', 'err')
    return false
  }
  form.value.robotId = null
  return true
}

function validateStepFour() {
  if (form.value.scheduleType === 'IMMEDIATE') {
    form.value.cronExpr = ''
    form.value.validFrom = null
    form.value.validTo = null
    return true
  }
  const cronExpr = buildCronExpr()
  if (!cronExpr) {
    toast.show('请完善定时规则', 'err')
    return false
  }
  if (form.value.validFrom && form.value.validTo && form.value.validTo < form.value.validFrom) {
    toast.show('生效截止日不能早于起始日', 'err')
    return false
  }
  form.value.cronExpr = cronExpr
  return true
}

function buildPayload(): CreateScheduleTaskRequest {
  return {
    name: form.value.name.trim(),
    description: form.value.description.trim() || null,
    tagIds: form.value.tagIds,
    appId: form.value.appId,
    inputParams: form.value.inputParams.map((item) => ({
      name: item.name,
      type: item.type,
      value: item.value ?? '',
      description: item.description ?? null,
      direction: item.direction,
      required: item.required,
    })),
    robotId: robotMode.value === 'ROBOT' ? form.value.robotId : null,
    groupUuid: robotMode.value === 'GROUP' ? form.value.groupUuid : null,
    executeScope: robotMode.value === 'GROUP' ? form.value.executeScope : null,
    scheduleType: form.value.scheduleType,
    cronExpr: form.value.scheduleType === 'CRON' ? form.value.cronExpr : null,
    validFrom: form.value.scheduleType === 'CRON' ? form.value.validFrom : null,
    validTo: form.value.scheduleType === 'CRON' ? form.value.validTo : null,
    priority: form.value.priority,
    retryTimes: form.value.retryTimes,
    runTimeoutSeconds: form.value.runTimeoutSeconds,
    waitTimeoutSeconds: form.value.waitTimeoutSeconds,
    enableCloudLog: form.value.enableCloudLog,
    enableCloudScreen: form.value.enableCloudScreen,
    callbackUrl: form.value.callbackUrl.trim() || null,
  }
}

async function submitTask() {
  submitting.value = true
  try {
    const payload = buildPayload()
    if (editingTaskId.value) {
      await scheduleApi.update(editingTaskId.value, payload)
      toast.show('任务已更新', 'ok')
    } else {
      await scheduleApi.create(payload)
      toast.show('任务已创建', 'ok')
    }
    modalOpen.value = false
    await loadTasks()
  } catch {
    toast.show('任务保存失败', 'err')
  } finally {
    submitting.value = false
  }
}

async function handleNext() {
  if (step.value === 1 && !validateStepOne()) return
  if (step.value === 2 && !validateStepTwo()) return
  if (step.value === 3 && !validateStepThree()) return
  if (step.value === 4 && !validateStepFour()) return
  if (step.value < 5) {
    step.value += 1
    return
  }
  await submitTask()
}

function handleBack() {
  if (step.value > 1) step.value -= 1
}

async function uploadParamFile(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const param = form.value.inputParams[index]
  param.uploading = true
  try {
    const uploaded = await filesApi.upload(file)
    param.value = uploaded.fileKey
    param.fileName = uploaded.fileName
    toast.show(`${param.name} 文件已上传`, 'ok')
  } catch {
    toast.show(`${param.name} 文件上传失败`, 'err')
  } finally {
    param.uploading = false
    input.value = ''
  }
}

async function triggerTask(taskId: string) {
  actionLoadingId.value = taskId
  try {
    await scheduleApi.trigger(taskId, { idempotentUuid: crypto.randomUUID(), inputParams: [] })
    toast.show('任务已触发', 'ok')
    await loadTasks()
  } catch {
    toast.show('触发任务失败', 'err')
  } finally {
    actionLoadingId.value = ''
  }
}

async function toggleStatus(taskId: string, status: TaskStatus) {
  actionLoadingId.value = taskId
  try {
    await scheduleApi.updateStatus(taskId, status === 'ENABLED' ? 'DISABLED' : 'ENABLED')
    toast.show(status === 'ENABLED' ? '任务已停用' : '任务已启用', 'ok')
    await loadTasks()
  } catch {
    toast.show('任务状态更新失败', 'err')
  } finally {
    actionLoadingId.value = ''
  }
}

function scheduleKeywordSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.value.current = 1
    void loadTasks()
  }, 300)
}

function handlePageChange(page: number) {
  pagination.value.current = page
  void loadTasks()
}

function handlePageSizeChange(size: number) {
  pagination.value = { ...pagination.value, current: 1, size }
  void loadTasks()
}

watch(keyword, scheduleKeywordSearch)

watch(
  () => robotMode.value,
  (mode) => {
    if (mode === 'ROBOT') {
      form.value.groupUuid = null
      form.value.executeScope = null
      return
    }
    form.value.robotId = null
    form.value.executeScope = form.value.executeScope || 'any'
  },
)

watch(
  () => form.value.scheduleType,
  (type) => {
    if (type === 'IMMEDIATE') {
      form.value.cronExpr = ''
      form.value.validFrom = null
      form.value.validTo = null
    }
  },
)

onMounted(async () => {
  await Promise.all([loadTasks(), loadOptions()])
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <section class="page">
    <PageHeader title="调度任务" subtitle="按 UI 向导完成任务配置、参数上传、机器人绑定与定时策略">
      <BaseButton size="sm" variant="accent" @click="openCreate">新建任务</BaseButton>
    </PageHeader>

    <SearchToolbar v-model="keyword" placeholder="搜索任务名称...">
      <div class="tbrgt">
        <BaseButton size="sm" :loading="loading" @click="loadTasks">刷新</BaseButton>
      </div>
    </SearchToolbar>

    <div class="tblwrap">
      <table>
        <thead>
          <tr>
            <th>任务名称</th>
            <th class="hm">绑定应用</th>
            <th class="hm">执行目标</th>
            <th>调度类型</th>
            <th>优先级</th>
            <th>状态</th>
            <th>最近执行</th>
            <th class="hm">标签</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="task in rows" :key="task.taskId">
            <td>
              <div class="cp">{{ task.name }}</div>
              <div class="cmono mt-0.5">{{ task.taskId }}</div>
            </td>
            <td class="hm cm">{{ task.appName }}</td>
            <td class="hm cm">{{ task.robotName || task.groupName || '-' }}</td>
            <td>
              <div>{{ task.scheduleType === 'CRON' ? '定时调度' : '立即触发' }}</div>
              <div class="cm text-[10px]">{{ task.cronExpr || '手动执行' }}</div>
            </td>
            <td><StatusPill v-bind="priorityMeta(task.priority)" /></td>
            <td><StatusPill v-bind="taskStatusMeta(task.status)" /></td>
            <td>
              <div class="cm">{{ task.lastExecutionTime || '-' }}</div>
              <StatusPill v-if="task.lastExecutionStatus" v-bind="statusMeta(task.lastExecutionStatus)" />
            </td>
            <td class="hm">
              <div class="tags">
                <span v-for="(tag, index) in task.tags" :key="tag.tagId" class="tag" :class="tagClass(index)">
                  {{ tag.name }}
                </span>
              </div>
            </td>
            <td>
              <div class="acts">
                <button class="a t" :disabled="actionLoadingId === task.taskId" @click="triggerTask(task.taskId)">
                  立即触发
                </button>
                <span class="asep">|</span>
                <button class="a" @click="openEdit(task.taskId)">编辑</button>
                <span class="asep">|</span>
                <button class="a" :disabled="actionLoadingId === task.taskId" @click="toggleStatus(task.taskId, task.status)">
                  {{ task.status === 'ENABLED' ? '停用' : '启用' }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="9" class="cm text-center">暂无调度任务</td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaginationBar
      :total-text="`共 ${pagination.total} 个调度任务`"
      :total="pagination.total"
      :current="pagination.current"
      :size="pagination.size"
      :page-size-options="[10, 50, 100]"
      @update:current="handlePageChange"
      @update:size="handlePageSizeChange"
    />

    <WizardModal
      :open="modalOpen"
      :title="editingTaskId ? '编辑调度任务' : '新建调度任务'"
      :step="step"
      :total="5"
      :can-back="step > 1"
      @close="closeModal"
      @back="handleBack"
      @next="handleNext"
    >
      <div class="wizard">
        <div class="wizard-top">
          <div class="wizard-bars">
            <span
              v-for="index in 5"
              :key="index"
              class="wizard-bar"
              :class="{ done: index < step, active: index === step }"
            />
          </div>
          <span class="wizard-label">{{ stepTitles[step - 1] }}</span>
        </div>

        <div v-if="step === 1" class="wizard-body">
          <div class="field">
            <label>任务名称 <span class="req">*</span></label>
            <input v-model="form.name" type="text" maxlength="50" placeholder="例如：财务凭证每日自动录入" />
          </div>
          <div class="field">
            <label>任务描述</label>
            <textarea v-model="form.description" placeholder="填写任务用途、影响范围和注意事项" />
          </div>
          <div class="field">
            <label>标签</label>
            <div class="check-grid">
              <label v-for="tag in tags" :key="tag.tagId" class="check-chip">
                <input v-model="form.tagIds" type="checkbox" :value="tag.tagId" />
                <span>{{ tag.name }}</span>
              </label>
            </div>
          </div>
        </div>

        <div v-else-if="step === 2" class="wizard-body">
          <div class="field">
            <label>选择 RPA 应用 <span class="req">*</span></label>
            <select v-model="form.appId" :disabled="optionsLoading || appLoading" @change="handleAppChange">
              <option value="">请选择应用</option>
              <option v-for="app in apps" :key="app.appId" :value="app.appId">
                {{ app.name }}{{ app.supportParam ? '（支持参数）' : '（无参数）' }}
              </option>
            </select>
            <div class="field-hint" v-if="selectedApp">
              当前版本：{{ selectedApp.version || '-' }} · {{ selectedApp.supportParam ? '支持参数配置' : '不支持参数' }}
            </div>
          </div>

          <div v-if="selectedApp && appDetail?.inputParams?.length" class="param-panel">
            <div class="param-title">应用参数配置</div>
            <table class="param-table">
              <thead>
                <tr>
                  <th>参数名</th>
                  <th>类型</th>
                  <th>值</th>
                  <th>必填</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(param, index) in form.inputParams" :key="param.name">
                  <td>
                    <div class="cmono">{{ param.name }}</div>
                    <div class="cm text-[10px]">{{ param.description || '-' }}</div>
                  </td>
                  <td><span class="type-pill">{{ param.type }}</span></td>
                  <td>
                    <input
                      v-if="param.direction === 'Out'"
                      :value="param.value as string"
                      type="text"
                      disabled
                      placeholder="出参无需填写"
                    />
                    <select v-else-if="param.type === 'bool'" v-model="param.value">
                      <option :value="''">请选择</option>
                      <option :value="true">true</option>
                      <option :value="false">false</option>
                    </select>
                    <input
                      v-else-if="param.type === 'float' || param.type === 'number' || param.type === 'int'"
                      v-model="param.value"
                      type="number"
                      placeholder="请输入数值"
                    />
                    <div v-else-if="param.type === 'file'" class="file-field">
                      <input type="file" :disabled="param.uploading" @change="uploadParamFile(index, $event)" />
                      <span class="file-name">
                        {{ param.fileName || (param.value ? '已上传 fileKey' : '未上传文件') }}
                      </span>
                    </div>
                    <input v-else v-model="param.value" type="text" placeholder="请输入参数值" />
                  </td>
                  <td class="cm">{{ param.required ? '是' : '否' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else-if="selectedApp && !appLoading" class="empty-tip">
            当前应用无可配置入参。
          </div>
        </div>

        <div v-else-if="step === 3" class="wizard-body">
          <div class="field">
            <label>执行模式 <span class="req">*</span></label>
            <div class="mode-grid">
              <label class="mode-card" :class="{ active: robotMode === 'ROBOT' }">
                <input v-model="robotMode" type="radio" value="ROBOT" />
                <span>指定机器人</span>
              </label>
              <label class="mode-card" :class="{ active: robotMode === 'GROUP' }">
                <input v-model="robotMode" type="radio" value="GROUP" />
                <span>指定机器人分组</span>
              </label>
            </div>
          </div>

          <div v-if="robotMode === 'ROBOT'" class="field">
            <label>选择机器人 <span class="req">*</span></label>
            <select v-model="form.robotId">
              <option :value="null">请选择机器人</option>
              <option v-for="robot in robots" :key="robot.robotId" :value="robot.robotId">
                {{ robot.name }}（{{ robot.status }} · {{ robot.clientIp || '-' }}）
              </option>
            </select>
            <div class="field-hint" v-if="selectedRobot?.status === 'OFFLINE'">
              所选机器人当前离线，任务触发后会等待其上线。
            </div>
          </div>

          <template v-else>
            <div class="field">
              <label>机器人分组 <span class="req">*</span></label>
              <select v-model="form.groupUuid">
                <option :value="null">请选择分组</option>
                <option v-for="group in groups" :key="group.xybotGroupUuid" :value="group.xybotGroupUuid">
                  {{ group.name }}
                </option>
              </select>
            </div>
            <div class="field">
              <label>执行范围 <span class="req">*</span></label>
              <div class="mode-grid">
                <label class="mode-card" :class="{ active: form.executeScope === 'any' }">
                  <input v-model="form.executeScope" type="radio" value="any" />
                  <span>任意一台可执行</span>
                </label>
                <label class="mode-card" :class="{ active: form.executeScope === 'all' }">
                  <input v-model="form.executeScope" type="radio" value="all" />
                  <span>要求全部可执行</span>
                </label>
              </div>
            </div>
          </template>
        </div>

        <div v-else-if="step === 4" class="wizard-body">
          <div class="field">
            <label>调度方式 <span class="req">*</span></label>
            <div class="mode-grid">
              <label class="mode-card" :class="{ active: form.scheduleType === 'IMMEDIATE' }">
                <input v-model="form.scheduleType" type="radio" value="IMMEDIATE" />
                <span>立即触发</span>
              </label>
              <label class="mode-card" :class="{ active: form.scheduleType === 'CRON' }">
                <input v-model="form.scheduleType" type="radio" value="CRON" />
                <span>定时调度</span>
              </label>
            </div>
          </div>

          <template v-if="form.scheduleType === 'CRON'">
            <div class="field">
              <label>定时规则</label>
              <select v-model="ruleMode">
                <option value="DAILY">每天执行</option>
                <option value="WEEKLY">每周执行</option>
                <option value="MONTHLY">每月执行</option>
                <option value="CUSTOM_CRON">自定义 Cron 表达式</option>
              </select>
            </div>

            <div class="form-grid-2" v-if="ruleMode !== 'CUSTOM_CRON'">
              <div class="field">
                <label>执行时间</label>
                <input v-model="dailyTime" type="time" />
              </div>
              <div class="field" v-if="ruleMode === 'WEEKLY'">
                <label>执行日</label>
                <select v-model="weeklyDay">
                  <option v-for="item in WEEK_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
              <div class="field" v-else-if="ruleMode === 'MONTHLY'">
                <label>执行日期</label>
                <input v-model.number="monthlyDay" type="number" min="1" max="28" />
              </div>
            </div>

            <div class="field" v-else>
              <label>Cron 表达式</label>
              <input v-model="cronInput" type="text" placeholder="例如：0 0/30 * * * ?" />
            </div>

            <div class="form-grid-2">
              <div class="field">
                <label>生效起始日</label>
                <input v-model="form.validFrom" type="date" />
              </div>
              <div class="field">
                <label>生效截止日</label>
                <input v-model="form.validTo" type="date" />
              </div>
            </div>
          </template>

          <div class="preview-box">
            <div class="preview-title">调度预览</div>
            <div class="cmono">{{ schedulePreview }}</div>
          </div>
        </div>

        <div v-else class="wizard-body">
          <div class="form-grid-2">
            <div class="field">
              <label>任务优先级</label>
              <select v-model="form.priority">
                <option value="0">低 (0)</option>
                <option value="100">中 (100)</option>
                <option value="200">高 (200)</option>
              </select>
            </div>
            <div class="field">
              <label>失败自动重试</label>
              <select v-model.number="form.retryTimes">
                <option :value="0">不重试</option>
                <option :value="1">1 次</option>
                <option :value="2">2 次</option>
                <option :value="3">3 次</option>
              </select>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="field">
              <label>应用运行超时（秒）</label>
              <input v-model.number="form.runTimeoutSeconds" type="number" min="1" placeholder="留空则不限制" />
            </div>
            <div class="field">
              <label>等待超时（秒）</label>
              <input v-model.number="form.waitTimeoutSeconds" type="number" min="1" placeholder="留空则不限制" />
            </div>
          </div>

          <div class="check-stack">
            <label class="check-inline">
              <input v-model="form.enableCloudLog" type="checkbox" />
              <span>开启云日志</span>
            </label>
            <label class="check-inline">
              <input v-model="form.enableCloudScreen" type="checkbox" />
              <span>开启云录屏</span>
            </label>
          </div>

          <div class="field">
            <label>回调地址</label>
            <input
              v-model="form.callbackUrl"
              type="text"
              placeholder="https://your-server.com/callback"
            />
            <div class="field-hint">配置后可由影刀主动推送执行结果。</div>
          </div>
        </div>
      </div>
    </WizardModal>
  </section>
</template>

<style scoped>
.wizard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.wizard-top {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wizard-bars {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}

.wizard-bar {
  height: 4px;
  border-radius: 999px;
  background: var(--border);
}

.wizard-bar.done {
  background: var(--s-ok);
}

.wizard-bar.active {
  background: var(--accent);
}

.wizard-label {
  font-size: 12px;
  color: var(--muted);
}

.wizard-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 12px;
  font-weight: 600;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  padding: 10px 12px;
  font-size: 13px;
  outline: none;
}

.field textarea {
  min-height: 92px;
  resize: vertical;
}

.field-hint {
  font-size: 11px;
  color: var(--muted);
}

.req {
  color: var(--s-err);
}

.check-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.check-chip,
.check-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mode-card {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  background: var(--surface);
}

.mode-card.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, white);
}

.form-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.param-panel {
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}

.param-title {
  padding: 12px 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted);
  text-transform: uppercase;
  background: var(--bg);
}

.param-table {
  width: 100%;
}

.param-table th,
.param-table td {
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  text-align: left;
  vertical-align: middle;
  font-size: 12px;
}

.type-pill {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bg);
  font-size: 11px;
}

.file-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-name {
  font-size: 11px;
  color: var(--muted);
}

.preview-box,
.empty-tip {
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: var(--bg);
  padding: 12px;
}

.preview-title {
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
}

.check-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 900px) {
  .mode-grid,
  .form-grid-2,
  .check-grid {
    grid-template-columns: 1fr;
  }
}
</style>
