<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppDrawer from '@/components/base/AppDrawer.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import PageHeader from '@/components/base/PageHeader.vue'
import PaginationBar from '@/components/base/PaginationBar.vue'
import SearchToolbar from '@/components/base/SearchToolbar.vue'
import StatusPill from '@/components/base/StatusPill.vue'
import { executionsApi } from '@/api/executions'
import { useToastStore } from '@/stores/toast'
import { duration, statusMeta } from '@/utils/format'
import type { PageResult, TaskExecutionDetailVO, TaskExecutionVO } from '@/types/api'

const toast = useToastStore()
const keyword = ref('')
const rows = ref<TaskExecutionVO[]>([])
const loading = ref(false)
const pagination = ref<Pick<PageResult<TaskExecutionVO>, 'total' | 'current' | 'size'>>({
  total: 0,
  current: 1,
  size: 10,
})
const actionLoadingId = ref('')
const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref<TaskExecutionDetailVO | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

async function loadExecutions() {
  loading.value = true
  try {
    const res = await executionsApi.list({
      page: pagination.value.current,
      size: pagination.value.size,
      keyword: keyword.value.trim() || undefined,
    })
    rows.value = res.records
    pagination.value = {
      total: res.total,
      current: res.current,
      size: res.size,
    }
  } catch {
    toast.show('执行记录加载失败', 'err')
  } finally {
    loading.value = false
  }
}

async function openDetail(executionId: string) {
  detailOpen.value = true
  detailLoading.value = true
  try {
    detail.value = await executionsApi.detail(executionId)
  } catch {
    toast.show('执行详情加载失败', 'err')
  } finally {
    detailLoading.value = false
  }
}

async function stopExecution(executionId: string) {
  actionLoadingId.value = executionId
  try {
    await executionsApi.stop(executionId)
    toast.show('执行已停止', 'ok')
    await loadExecutions()
    if (detail.value?.executionId === executionId) await openDetail(executionId)
  } catch {
    toast.show('停止执行失败', 'err')
  } finally {
    actionLoadingId.value = ''
  }
}

async function retryExecution(executionId: string) {
  actionLoadingId.value = executionId
  try {
    await executionsApi.retry(executionId)
    toast.show('已发起重试', 'ok')
    await loadExecutions()
  } catch {
    toast.show('重试执行失败', 'err')
  } finally {
    actionLoadingId.value = ''
  }
}

function scheduleKeywordSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.value.current = 1
    void loadExecutions()
  }, 300)
}

function handlePageChange(page: number) {
  pagination.value.current = page
  void loadExecutions()
}

function handlePageSizeChange(size: number) {
  pagination.value = { ...pagination.value, current: 1, size }
  void loadExecutions()
}

onMounted(loadExecutions)

watch(keyword, scheduleKeywordSearch)

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <section class="page">
    <PageHeader title="执行记录" subtitle="查看任务执行状态、时长、错误信息和云日志产物">
      <BaseButton size="sm" :loading="loading" @click="loadExecutions">刷新</BaseButton>
    </PageHeader>
    <SearchToolbar v-model="keyword" placeholder="搜索执行 ID、任务名称..."></SearchToolbar>
    <div class="tblwrap">
      <table>
        <thead><tr><th>执行 ID</th><th>任务名称</th><th class="hm">应用</th><th class="hm">机器人</th><th>触发方式</th><th>触发时间</th><th>时长</th><th>状态</th><th>异常</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="execution in rows" :key="execution.executionId">
            <td><span class="cmono">{{ execution.executionId }}</span></td>
            <td class="cp">{{ execution.taskName }}</td>
            <td class="hm cm">{{ execution.appName }}</td>
            <td class="hm cm">{{ execution.robotName || '-' }}</td>
            <td>{{ execution.triggerType === 'MANUAL' ? '手动' : '定时' }}</td>
            <td class="cmono">{{ execution.triggeredAt }}</td>
            <td class="cmono">{{ duration(execution.durationSeconds) }}</td>
            <td><StatusPill v-bind="statusMeta(execution.status)" /></td>
            <td class="cm">{{ execution.errorMessage || '-' }}</td>
            <td>
              <div class="acts">
                <button class="a" @click="openDetail(execution.executionId)">详情</button>
                <span class="asep">|</span>
                <button
                  class="a"
                  :disabled="actionLoadingId === execution.executionId"
                  @click="execution.status === 'RUNNING' ? stopExecution(execution.executionId) : retryExecution(execution.executionId)"
                >
                  {{ execution.status === 'RUNNING' ? '停止' : '重试' }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!rows.length"><td colspan="10" class="cm text-center">暂无执行记录</td></tr>
        </tbody>
      </table>
    </div>
    <PaginationBar
      :total-text="`共 ${pagination.total} 条执行记录`"
      :total="pagination.total"
      :current="pagination.current"
      :size="pagination.size"
      :page-size-options="[10, 50, 100]"
      @update:current="handlePageChange"
      @update:size="handlePageSizeChange"
    />

    <AppDrawer :open="detailOpen" title="执行详情" @close="detailOpen = false">
      <div v-if="detailLoading" class="cm">加载中...</div>
      <template v-else-if="detail">
        <div class="field"><label>执行 ID</label><div class="cmono">{{ detail.executionId }}</div></div>
        <div class="field"><label>任务名称</label><div>{{ detail.taskName }}</div></div>
        <div class="field form-grid-2">
          <div>
            <label>状态</label>
            <StatusPill v-bind="statusMeta(detail.status)" />
          </div>
          <div>
            <label>时长</label>
            <div class="cmono">{{ duration(detail.durationSeconds) }}</div>
          </div>
        </div>
        <div class="field"><label>异常信息</label><div class="cm">{{ detail.errorMessage || '-' }}</div></div>
        <div class="field"><label>输入参数</label><pre class="cm">{{ JSON.stringify(detail.inputParamsSnapshot || [], null, 2) }}</pre></div>
        <div class="field"><label>输出参数</label><pre class="cm">{{ JSON.stringify(detail.outputParamsSnapshot || [], null, 2) }}</pre></div>
      </template>
      <template #footer>
        <BaseButton @click="detailOpen = false">关闭</BaseButton>
      </template>
    </AppDrawer>
  </section>
</template>
