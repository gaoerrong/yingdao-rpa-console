<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppDrawer from '@/components/base/AppDrawer.vue'
import AppModal from '@/components/base/AppModal.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import PageHeader from '@/components/base/PageHeader.vue'
import PaginationBar from '@/components/base/PaginationBar.vue'
import SearchToolbar from '@/components/base/SearchToolbar.vue'
import StatusPill from '@/components/base/StatusPill.vue'
import { robotsApi } from '@/api/robots'
import { tagsApi } from '@/api/tags'
import { tenantsApi } from '@/api/tenants'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useViewScopeStore } from '@/stores/viewScope'
import { robotStatusMeta } from '@/utils/format'
import type { DepartmentVO, PageResult, RobotVO, TagVO, TenantVO } from '@/types/api'

const toast = useToastStore()
const auth = useAuthStore()
const viewScope = useViewScopeStore()
const rows = ref<RobotVO[]>([])
const keyword = ref('')
const syncLoading = ref(false)
const loading = ref(false)
const pagination = ref<Pick<PageResult<RobotVO>, 'total' | 'current' | 'size'>>({
  total: 0,
  current: 1,
  size: 10,
})
const lastSync = ref('最后同步: -')
const editOpen = ref(false)
const editLoading = ref(false)
const editSaving = ref(false)
const editDetail = ref<RobotVO | null>(null)
const tenants = ref<TenantVO[]>([])
/** 编辑抽屉内：当前所选租户下的部门（按租户实时拉取，与列表页全局 options 解耦） */
const editDepartments = ref<DepartmentVO[]>([])
const editForm = ref<{ tenantId: string; deptId: string }>({ tenantId: '', deptId: '' })
const tagModalOpen = ref(false)
const tagSaving = ref(false)
const currentRobot = ref<RobotVO | null>(null)
const tags = ref<TagVO[]>([])
const selectedTagIds = ref<string[]>([])
let searchTimer: ReturnType<typeof setTimeout> | null = null

const isSuperAdmin = computed(() => auth.role === 'SUPER_ADMIN')
const currentTenantOption = computed(() =>
  auth.user?.tenantId
    ? { tenantId: auth.user.tenantId, name: auth.user.tenantName || auth.user.tenantId }
    : null,
)
const currentTenantLabel = computed(() => currentTenantOption.value?.name || '当前租户')
const displayedEditTenantName = computed(() => viewScope.selectedTenant?.name || currentTenantLabel.value)
const tenantIdForDeptPicker = computed(
  () =>
    editForm.value.tenantId ||
    viewScope.selectedTenantId ||
    auth.user?.tenantId ||
    editDetail.value?.tenantId ||
    '',
)

function resolveTenantIdForEditForm(detail: RobotVO): string {
  if (isSuperAdmin.value) {
    return detail.tenantId || viewScope.selectedTenantId || ''
  }
  return viewScope.selectedTenantId || currentTenantOption.value?.tenantId || detail.tenantId || ''
}

async function loadTenantOptionsForSuperAdmin() {
  if (!isSuperAdmin.value) return
  try {
    const tenantRes = await tenantsApi.list({ page: 1, size: 200 })
    tenants.value = tenantRes.records
  } catch {
    tenants.value = []
    toast.show('租户列表加载失败', 'err')
  }
}

function applyDepartmentFallback(tenantId: string) {
  if (
    editDepartments.value.length === 0 &&
    tenantId &&
    viewScope.selectedTenantId === tenantId &&
    viewScope.departmentOptions.length > 0
  ) {
    editDepartments.value = [...viewScope.departmentOptions]
  }
}

async function loadEditDepartments(tenantId: string | null | undefined) {
  if (!tenantId) {
    editDepartments.value = []
    return
  }
  try {
    editDepartments.value = await tenantsApi.departments(tenantId)
  } catch {
    editDepartments.value = []
    toast.show('部门列表加载失败', 'err')
  }
  applyDepartmentFallback(tenantId)
}

async function onEditTenantChange() {
  editForm.value.deptId = ''
  await loadEditDepartments(editForm.value.tenantId)
}

async function loadRobots() {
  loading.value = true
  try {
    const res = await robotsApi.list({
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
    const latest = res.records[0]?.syncedAt
    lastSync.value = latest ? `最后同步: ${new Date(latest).toLocaleString()}` : '最后同步: -'
  } catch {
    toast.show('机器人数据加载失败', 'err')
  } finally {
    loading.value = false
  }
}

async function loadTagOptions() {
  try {
    tags.value = await tagsApi.list()
  } catch {
    toast.show('机器人标签配置加载失败', 'err')
  }
}

async function syncRobots() {
  syncLoading.value = true
  try {
    const res = await robotsApi.sync()
    lastSync.value = `最后同步: ${new Date(res.lastSyncTime).toLocaleString()}`
    toast.show(`同步成功，共同步 ${res.synced} 台机器人`, 'ok')
    await loadRobots()
    if (editOpen.value && editDetail.value) {
      await openEdit(editDetail.value.robotId)
    }
  } catch {
    toast.show('机器人同步失败', 'err')
  } finally {
    syncLoading.value = false
  }
}

async function openEdit(robotId: string) {
  editOpen.value = true
  editLoading.value = true
  try {
    try {
      await viewScope.initialize()
    } catch {
      /* 与顶栏并行初始化时可能失败，忽略 */
    }
    if (isSuperAdmin.value) {
      await loadTenantOptionsForSuperAdmin()
    }
    const detail = await robotsApi.detail(robotId)
    editDetail.value = detail
    const tenantId = resolveTenantIdForEditForm(detail)
    editForm.value = {
      tenantId,
      deptId: detail.deptId || '',
    }
    const tidForDeps =
      tenantId || viewScope.selectedTenantId || auth.user?.tenantId || detail.tenantId || ''
    await loadEditDepartments(tidForDeps)
  } catch {
    toast.show('机器人信息加载失败', 'err')
    editOpen.value = false
  } finally {
    editLoading.value = false
  }
}

function openTagModal(robot: RobotVO) {
  currentRobot.value = robot
  selectedTagIds.value = robot.tags.map((item) => item.tagId)
  tagModalOpen.value = true
}

async function saveTags() {
  if (!currentRobot.value) return
  tagSaving.value = true
  try {
    await tagsApi.setResourceTags({
      resourceType: 'ROBOT',
      resourceId: currentRobot.value.robotId,
      tagIds: selectedTagIds.value,
    })
    toast.show('机器人标签已更新', 'ok')
    tagModalOpen.value = false
    await loadRobots()
    if (editOpen.value && editDetail.value?.robotId === currentRobot.value.robotId) {
      await openEdit(currentRobot.value.robotId)
    }
  } catch {
    toast.show('机器人标签更新失败', 'err')
  } finally {
    tagSaving.value = false
  }
}

function scheduleKeywordSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.value.current = 1
    void loadRobots()
  }, 300)
}

function handlePageChange(page: number) {
  pagination.value.current = page
  void loadRobots()
}

function handlePageSizeChange(size: number) {
  pagination.value = { ...pagination.value, current: 1, size }
  void loadRobots()
}

async function saveRobotAffiliation() {
  if (!editDetail.value?.robotId) {
    return
  }
  const effectiveTenantId = isSuperAdmin.value
    ? editForm.value.tenantId
    : viewScope.selectedTenantId || currentTenantOption.value?.tenantId || editDetail.value.tenantId || ''
  if (isSuperAdmin.value && !editForm.value.tenantId) {
    toast.show('请选择归属租户', 'err')
    return
  }
  if (!isSuperAdmin.value && !effectiveTenantId) {
    toast.show('当前租户或视角未就绪，无法保存', 'err')
    return
  }
  if (editForm.value.deptId && !editDepartments.value.some((d) => d.deptId === editForm.value.deptId)) {
    toast.show('所选部门不属于当前租户，请重新选择部门', 'err')
    return
  }
  editSaving.value = true
  try {
    const rid = editDetail.value.robotId
    const prevTenant = editDetail.value.tenantId || ''
    if (isSuperAdmin.value && editForm.value.tenantId && editForm.value.tenantId !== prevTenant) {
      await robotsApi.assignTenant(rid, { tenantId: editForm.value.tenantId })
    }
    await robotsApi.assignDepartment(rid, { deptId: editForm.value.deptId ? editForm.value.deptId : null })
    toast.show('归属已保存', 'ok')
    await loadRobots()
    await openEdit(editDetail.value.robotId)
  } catch {
    toast.show('保存失败', 'err')
  } finally {
    editSaving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadRobots(), loadTagOptions()])
  if (isSuperAdmin.value) {
    await loadTenantOptionsForSuperAdmin()
  }
})

watch(keyword, scheduleKeywordSearch)

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <section class="page">
    <PageHeader title="机器人管理" subtitle="执行客户端状态与归属管理 · 每5分钟自动同步">
      <BaseButton size="sm" :loading="syncLoading" @click="syncRobots">手动同步</BaseButton>
    </PageHeader>
    <SearchToolbar v-model="keyword" placeholder="搜索机器人名称、IP...">
      <div class="tbrgt"><span class="sync-info">{{ lastSync }}</span></div>
    </SearchToolbar>
    <div class="tblwrap">
      <table>
        <thead><tr><th class="w-9"><input type="checkbox" /></th><th>机器人名称</th><th class="hm">所属分组</th><th class="hm">归属租户</th><th>归属部门</th><th>状态</th><th class="hm">当前运行应用</th><th>最后心跳</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="robot in rows" :key="robot.robotId">
            <td><input type="checkbox" /></td>
            <td><div class="cp">{{ robot.name }}</div><div class="cmono mt-0.5">{{ robot.clientIp || '-' }}</div></td>
            <td class="hm cm">{{ robot.groupName || '-' }}</td>
            <td class="hm cm">{{ robot.tenantName || '-' }}</td>
            <td class="cm">{{ robot.deptName || '-' }}</td>
            <td><StatusPill v-bind="robotStatusMeta(robot.status)" /></td>
            <td class="hm cm">{{ robot.currentAppName || '-' }}</td>
            <td><span class="cmono">{{ robot.lastHeartbeat || '-' }}</span></td>
            <td><div class="acts"><button class="a" @click="openEdit(robot.robotId)">编辑</button><span class="asep">|</span><button class="a" @click="openTagModal(robot)">标签</button></div></td>
          </tr>
          <tr v-if="!rows.length"><td colspan="9" class="cm text-center">暂无机器人数据</td></tr>
        </tbody>
      </table>
    </div>
    <PaginationBar
      :total-text="`共 ${pagination.total} 台机器人`"
      :total="pagination.total"
      :current="pagination.current"
      :size="pagination.size"
      :page-size-options="[10, 50, 100]"
      @update:current="handlePageChange"
      @update:size="handlePageSizeChange"
    />

    <AppDrawer :open="editOpen" title="编辑机器人" @close="editOpen = false">
      <div v-if="editLoading" class="cm py-6 text-center">加载中…</div>
      <template v-else-if="editDetail">
        <div class="field"><label>机器人名称</label><div>{{ editDetail.name }}</div></div>
        <div class="field form-grid-2">
          <div><label>状态</label><StatusPill v-bind="robotStatusMeta(editDetail.status)" /></div>
          <div><label>分组</label><div>{{ editDetail.groupName || '-' }}</div></div>
        </div>
        <div class="field"><label>关联账号</label><div>{{ editDetail.accountName || '未匹配' }}</div></div>
        <div class="field"><label>当前应用</label><div>{{ editDetail.currentAppName || '-' }}</div></div>
        <div class="field">
          <label>归属租户</label>
          <select
            v-if="isSuperAdmin"
            v-model="editForm.tenantId"
            @change="onEditTenantChange"
          >
            <option value="">请选择租户</option>
            <option v-for="tenant in tenants" :key="tenant.tenantId" :value="tenant.tenantId">{{ tenant.name }}</option>
          </select>
          <div v-else class="field-static">{{ displayedEditTenantName }}</div>
        </div>
        <div class="field">
          <label>归属部门</label>
          <select v-model="editForm.deptId" :disabled="!tenantIdForDeptPicker">
            <option value="">未分配</option>
            <option v-for="dept in editDepartments" :key="dept.deptId" :value="dept.deptId">{{ dept.name }}</option>
          </select>
        </div>
        <div class="field"><label>标签</label><div class="tags"><span v-for="tag in editDetail.tags" :key="tag.tagId" class="tag">{{ tag.name }}</span></div><p class="cm mt-1 text-xs">在列表中点击「标签」可修改</p></div>
      </template>
      <template #footer>
        <BaseButton @click="editOpen = false">取消</BaseButton>
        <BaseButton variant="primary" :loading="editSaving" @click="saveRobotAffiliation">保存归属</BaseButton>
      </template>
    </AppDrawer>

    <AppModal :open="tagModalOpen" title="设置机器人标签" @close="tagModalOpen = false">
      <div class="grid grid-cols-2 gap-2">
        <label v-for="tag in tags" :key="tag.tagId" class="cm flex items-center gap-2">
          <input v-model="selectedTagIds" type="checkbox" :value="tag.tagId" />
          <span>{{ tag.name }}</span>
        </label>
      </div>
      <template #footer>
        <BaseButton @click="tagModalOpen = false">取消</BaseButton>
        <BaseButton variant="primary" :loading="tagSaving" @click="saveTags">保存</BaseButton>
      </template>
    </AppModal>
  </section>
</template>
