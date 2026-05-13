<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppDrawer from '@/components/base/AppDrawer.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import PageHeader from '@/components/base/PageHeader.vue'
import PaginationBar from '@/components/base/PaginationBar.vue'
import SearchToolbar from '@/components/base/SearchToolbar.vue'
import StatusPill from '@/components/base/StatusPill.vue'
import { accountsApi } from '@/api/accounts'
import { tagsApi } from '@/api/tags'
import { tenantsApi } from '@/api/tenants'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useViewScopeStore } from '@/stores/viewScope'
import { roleMeta, tagClass } from '@/utils/format'
import type { AccountVO, ConsoleRole, DepartmentVO, PageResult, TagVO, TenantVO } from '@/types/api'

const toast = useToastStore()
const auth = useAuthStore()
const viewScope = useViewScopeStore()
const keyword = ref('')
const loading = ref(false)
const syncLoading = ref(false)
const rows = ref<AccountVO[]>([])
const pagination = ref<Pick<PageResult<AccountVO>, 'total' | 'current' | 'size'>>({
  total: 0,
  current: 1,
  size: 10,
})
const tenants = ref<TenantVO[]>([])
const departments = ref<DepartmentVO[]>([])
const tagOptions = ref<TagVO[]>([])
const lastSync = ref('最后同步: -')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const drawerOpen = ref(false)
const saving = ref(false)
const currentAccount = ref<AccountVO | null>(null)
const isSuperAdmin = computed(() => auth.role === 'SUPER_ADMIN')
const currentTenantOption = computed(() =>
  auth.user?.tenantId
    ? {
        tenantId: auth.user.tenantId,
        name: auth.user.tenantName || auth.user.tenantId,
      }
    : null,
)
const currentTenantLabel = computed(() => currentTenantOption.value?.name || '当前租户')
const form = ref<{
  tenantId: string
  deptId: string
  role: ConsoleRole
  tagIds: string[]
}>({
  tenantId: '',
  deptId: '',
  role: 'MEMBER',
  tagIds: [],
})

const availableDepartments = computed(() =>
  departments.value.filter((item) => item.tenantId === form.value.tenantId),
)

const roleLocked = computed(() => !isSuperAdmin.value)

async function loadAccounts() {
  loading.value = true
  try {
    const res = await accountsApi.list({
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
    const latest = res.records[0]?.syncedAt
    lastSync.value = latest ? `最后同步: ${new Date(latest).toLocaleString()}` : '最后同步: -'
  } catch {
    toast.show('账号数据加载失败', 'err')
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  try {
    if (isSuperAdmin.value) {
      const tenantRes = await tenantsApi.list({ page: 1, size: 200 })
      tenants.value = tenantRes.records
      const allDepartments = await Promise.all(tenants.value.map((tenant) => tenantsApi.departments(tenant.tenantId)))
      departments.value = allDepartments.flat()
    } else {
      const tenantId = currentTenantOption.value?.tenantId
      tenants.value = tenantId ? [{ tenantId, name: currentTenantOption.value?.name || tenantId, description: null, status: 'ACTIVE', deptCount: 0, accountCount: 0, createdAt: '' }] : []
      departments.value = viewScope.departmentOptions.length && viewScope.selectedTenantId === tenantId
        ? viewScope.departmentOptions
        : tenantId
          ? await tenantsApi.departments(tenantId)
          : []
    }
    tagOptions.value = await tagsApi.list()
  } catch {
    toast.show('账号配置项加载失败', 'err')
  }
}

async function syncAccounts() {
  syncLoading.value = true
  try {
    const res = await accountsApi.sync()
    lastSync.value = `最后同步: ${new Date(res.lastSyncTime).toLocaleTimeString()}`
    toast.show(`同步成功，共同步 ${res.synced} 条账号`, 'ok')
    await loadAccounts()
  } catch {
    toast.show('账号同步失败', 'err')
  } finally {
    syncLoading.value = false
  }
}

function openManage(account: AccountVO) {
  currentAccount.value = account
  form.value = {
    tenantId: isSuperAdmin.value ? (account.tenantId || '') : (currentTenantOption.value?.tenantId || account.tenantId || ''),
    deptId: account.deptId || '',
    role: isSuperAdmin.value ? account.consoleRole : account.consoleRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'MEMBER',
    tagIds: account.tags.map((item) => item.tagId),
  }
  drawerOpen.value = true
}

async function saveAccount() {
  if (!currentAccount.value) return
  if (isSuperAdmin.value && !form.value.tenantId && form.value.role !== 'SUPER_ADMIN') {
    toast.show('非超级管理员账号必须绑定租户', 'err')
    return
  }
  if (!isSuperAdmin.value && !currentTenantOption.value?.tenantId) {
    toast.show('当前租户信息缺失，无法保存账号', 'err')
    return
  }
  saving.value = true
  try {
    if (isSuperAdmin.value && form.value.tenantId) {
      await accountsApi.assignTenant(currentAccount.value.accountId, {
        tenantId: form.value.tenantId,
        role: form.value.role,
      })
      await accountsApi.assignDepartment(currentAccount.value.accountId, form.value.deptId || null)
      await accountsApi.updateRole(currentAccount.value.accountId, form.value.role)
    } else if (isSuperAdmin.value && form.value.role !== 'SUPER_ADMIN') {
      throw new Error('missing tenant')
    } else {
      await accountsApi.assignDepartment(currentAccount.value.accountId, form.value.deptId || null)
    }
    await tagsApi.setResourceTags({
      resourceType: 'ACCOUNT',
      resourceId: currentAccount.value.accountId,
      tagIds: form.value.tagIds,
    })
    toast.show('账号设置已保存', 'ok')
    drawerOpen.value = false
    await loadAccounts()
  } catch {
    toast.show('账号设置保存失败', 'err')
  } finally {
    saving.value = false
  }
}

function scheduleKeywordSearch() {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    pagination.value.current = 1
    void loadAccounts()
  }, 300)
}

function handlePageChange(page: number) {
  pagination.value.current = page
  void loadAccounts()
}

function handlePageSizeChange(size: number) {
  pagination.value = {
    ...pagination.value,
    current: 1,
    size,
  }
  void loadAccounts()
}

onMounted(async () => {
  await Promise.all([loadAccounts(), loadOptions()])
})

watch(keyword, () => {
  scheduleKeywordSearch()
})

watch(
  () => [viewScope.selectedTenantId, viewScope.departmentOptions.length] as const,
  () => {
    if (!isSuperAdmin.value) {
      void loadOptions()
    }
  },
)

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})
</script>

<template>
  <section class="page">
    <PageHeader title="账号管理" subtitle="系统账号同步、角色分配与租户部门关联">
      <BaseButton size="sm" :loading="syncLoading" @click="syncAccounts">
        <svg v-if="!syncLoading" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M11 6.5A4.5 4.5 0 112 6.5" /><path d="M11 2v4.5H6.5" /></svg>
        手动同步
      </BaseButton>
    </PageHeader>
    <SearchToolbar v-model="keyword" placeholder="搜索账号名称、登录账号...">
      <div class="tbrgt"><span class="sync-info">{{ lastSync }}</span></div>
    </SearchToolbar>
    <div class="tblwrap">
      <table>
        <thead><tr><th class="w-9"><input type="checkbox" /></th><th>账号名称</th><th>登录账号</th><th>账号类型</th><th class="hm">归属租户</th><th class="hm">归属部门</th><th>Console 角色</th><th class="hm">标签</th><th>状态</th><th class="w-44">操作</th></tr></thead>
        <tbody>
          <tr v-for="account in rows" :key="account.accountId" :class="{ 'opacity-65': account.status === 'EXPIRED' }">
            <td><input type="checkbox" /></td>
            <td><div class="cp">{{ account.name }}</div><div class="cm text-[10px]">{{ account.phone || '-' }}</div></td>
            <td><span class="cmono">{{ account.loginAccount }}</span></td>
            <td class="cm">{{ account.xybotAccountType === 'senior' ? '高级账号' : account.xybotAccountType === 'basic' ? '基础账号' : '-' }}</td>
            <td class="hm cm">{{ account.tenantName || '-' }}</td>
            <td class="hm cm">{{ account.deptName || '-' }}</td>
            <td><StatusPill v-bind="roleMeta(account.consoleRole)" /></td>
            <td class="hm"><div class="tags"><span v-for="(tag, index) in account.tags" :key="tag.tagId" class="tag" :class="tagClass(index)">{{ tag.name }}</span></div></td>
            <td><StatusPill :label="account.status === 'ACTIVE' ? '正常' : '已失效'" :tone="account.status === 'ACTIVE' ? 'ok' : 'err'" /></td>
            <td>
              <div class="acts">
                <button class="a" @click="openManage(account)">编辑</button>
              </div>
            </td>
          </tr>
          <tr v-if="!rows.length"><td colspan="10" class="cm text-center">暂无账号数据</td></tr>
        </tbody>
      </table>
    </div>
    <PaginationBar
      :total-text="`共 ${pagination.total} 条账号`"
      :total="pagination.total"
      :current="pagination.current"
      :size="pagination.size"
      :page-size-options="[10, 50, 100]"
      @update:current="handlePageChange"
      @update:size="handlePageSizeChange"
    />

    <AppDrawer :open="drawerOpen" title="编辑账号" @close="drawerOpen = false">
      <div v-if="currentAccount" class="field">
        <label>账号</label>
        <div>{{ currentAccount.name }}（{{ currentAccount.loginAccount }}）</div>
      </div>
      <div class="field">
        <label>租户</label>
        <select v-if="isSuperAdmin" v-model="form.tenantId">
          <option value="">未分配</option>
          <option v-for="tenant in tenants" :key="tenant.tenantId" :value="tenant.tenantId">{{ tenant.name }}</option>
        </select>
        <div v-else class="field-static">{{ currentTenantLabel }}</div>
      </div>
      <div class="field">
        <label>部门</label>
        <select v-model="form.deptId" :disabled="!form.tenantId">
          <option value="">未分配</option>
          <option v-for="dept in availableDepartments" :key="dept.deptId" :value="dept.deptId">{{ dept.name }}</option>
        </select>
      </div>
      <div class="field">
        <label>角色</label>
        <select v-if="isSuperAdmin" v-model="form.role">
          <option value="SUPER_ADMIN">超级管理员</option>
          <option value="TENANT_ADMIN">租户管理员</option>
          <option value="MEMBER">员工</option>
        </select>
        <div v-else class="field-static">{{ roleLocked ? '租户管理员视角：仅可调整部门和标签' : '员工' }}</div>
      </div>
      <div class="field">
        <label>标签</label>
        <div v-if="tagOptions.length" class="flex flex-wrap gap-2">
          <label
            v-for="tag in tagOptions"
            :key="tag.tagId"
            class="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition"
            :style="form.tagIds.includes(tag.tagId)
              ? { backgroundColor: `${tag.color}20`, borderColor: tag.color, color: tag.color }
              : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }"
          >
            <input v-model="form.tagIds" type="checkbox" :value="tag.tagId" />
            <span class="inline-block h-2 w-2 rounded-full" :style="{ backgroundColor: tag.color }"></span>
            <span>{{ tag.name }}</span>
          </label>
        </div>
        <div v-else class="field-static">暂无可用标签</div>
      </div>
      <template #footer>
        <BaseButton @click="drawerOpen = false">取消</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="saveAccount">保存</BaseButton>
      </template>
    </AppDrawer>
  </section>
</template>
