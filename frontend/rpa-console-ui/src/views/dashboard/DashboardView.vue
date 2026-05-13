<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import PageHeader from '@/components/base/PageHeader.vue'
import StatusPill from '@/components/base/StatusPill.vue'
import { dashboardApi } from '@/api/dashboard'
import { executionsApi } from '@/api/executions'
import { duration, statusMeta } from '@/utils/format'
import { useToastStore } from '@/stores/toast'
import type { DashboardAppRankingItemVO, DashboardStatsVO, TaskExecutionVO } from '@/types/api'

const toast = useToastStore()
const loading = ref(false)
const stats = ref<DashboardStatsVO>({
  todayExecutionCount: 0,
  todayExecutionCountDelta: 0,
  todaySuccessRate: 0,
  todaySuccessRateDelta: 0,
  todayRobotUtilization: 0,
  todayRobotUtilizationDelta: 0,
  totalExecutionCount: 0,
  activeRobotCount: 0,
})
const ranking = ref<DashboardAppRankingItemVO[]>([])
const recentExecutions = ref<TaskExecutionVO[]>([])

async function loadDashboard() {
  loading.value = true
  try {
    const [statsRes, rankingRes, executionsRes] = await Promise.all([
      dashboardApi.stats(),
      dashboardApi.appRanking({ days: 7 }),
      executionsApi.list({ page: 1, size: 5 }),
    ])
    stats.value = statsRes
    ranking.value = rankingRes.items
    recentExecutions.value = executionsRes.records
  } catch {
    toast.show('概览数据加载失败', 'err')
  } finally {
    loading.value = false
  }
}

function barWidth(index: number) {
  if (!ranking.value.length) return '0%'
  const max = Math.max(...ranking.value.map((item) => item.executionCount), 1)
  return `${Math.max((ranking.value[index].executionCount / max) * 100, 8)}%`
}

onMounted(loadDashboard)
</script>

<template>
  <section class="page">
    <PageHeader title="概览" subtitle="调度运行数据汇总">
      <BaseButton size="sm" :loading="loading" @click="loadDashboard">刷新数据</BaseButton>
    </PageHeader>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">今日执行次数</div>
        <div class="kpi-val">{{ stats.todayExecutionCount }}</div>
        <div class="kpi-sub">较昨日 {{ stats.todayExecutionCountDelta >= 0 ? '+' : '' }}{{ stats.todayExecutionCountDelta }}</div>
      </div>
      <div class="kpi kpi-ok">
        <div class="kpi-label">今日成功率</div>
        <div class="kpi-val">{{ Math.round(stats.todaySuccessRate * 1000) / 10 }}%</div>
        <div class="kpi-sub">较昨日 {{ stats.todaySuccessRateDelta >= 0 ? '+' : '' }}{{ Math.round(stats.todaySuccessRateDelta * 1000) / 10 }}%</div>
      </div>
      <div class="kpi kpi-acc">
        <div class="kpi-label">活跃机器人</div>
        <div class="kpi-val">{{ stats.activeRobotCount }}</div>
        <div class="kpi-sub">在线或忙碌状态</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">机器人利用率</div>
        <div class="kpi-val">{{ Math.round(stats.todayRobotUtilization * 100) }}%</div>
        <div class="kpi-sub">较昨日 {{ stats.todayRobotUtilizationDelta >= 0 ? '+' : '' }}{{ Math.round(stats.todayRobotUtilizationDelta * 100) }}%</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">累计执行次数</div>
        <div class="kpi-val">{{ stats.totalExecutionCount.toLocaleString() }}</div>
        <div class="kpi-sub">系统累计执行总量</div>
      </div>
    </div>

    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-title">近 7 日执行趋势</div>
        <div class="flex flex-1 items-center justify-center text-sm text-[var(--muted)]">
          当前后端已提供统计接口，图形趋势可继续扩展；核心指标已接入真实数据。
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title">应用执行排行 Top 5</div>
        <div class="flex flex-1 flex-col justify-center">
          <div v-for="(item, index) in ranking.slice(0, 5)" :key="item.appName" class="mini-bar-row">
            <span class="mini-bar-label">{{ item.appName }}</span>
            <div class="mini-bar-track">
              <div class="mini-bar-fill" :class="{ ok: index < 2 }" :style="{ width: barWidth(index) }"></div>
            </div>
            <span class="mini-bar-num">{{ item.executionCount }}</span>
          </div>
          <div v-if="!ranking.length" class="cm text-center">暂无排行数据</div>
        </div>
      </div>
    </div>

    <div class="recent-block">
      <div class="chart-card">
        <div class="inline-card-header">
          <span class="chart-title m-0 flex-1">最近执行</span>
          <RouterLink to="/schedule/executions"><BaseButton variant="ghost" size="sm">查看全部</BaseButton></RouterLink>
        </div>
        <table>
          <thead><tr><th>执行 ID</th><th>任务名称</th><th class="hm">机器人</th><th class="hm">时长</th><th>状态</th></tr></thead>
          <tbody>
            <tr v-for="item in recentExecutions" :key="item.executionId">
              <td><span class="cmono">{{ item.executionId }}</span></td>
              <td class="cp">{{ item.taskName }}</td>
              <td class="hm cm">{{ item.robotName || '-' }}</td>
              <td class="hm cmono">{{ duration(item.durationSeconds) }}</td>
              <td><StatusPill v-bind="statusMeta(item.status)" /></td>
            </tr>
            <tr v-if="!recentExecutions.length">
              <td colspan="5" class="cm text-center">暂无执行记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
