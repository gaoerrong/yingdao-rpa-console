<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppModal from '@/components/base/AppModal.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import PageHeader from '@/components/base/PageHeader.vue'
import PaginationBar from '@/components/base/PaginationBar.vue'
import SearchToolbar from '@/components/base/SearchToolbar.vue'
import StatusPill from '@/components/base/StatusPill.vue'
import { tenantsApi } from '@/api/tenants'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { tenantStatusMeta } from '@/utils/format'
import type { DepartmentVO, PageResult, TenantStatus, TenantVO } from '@/types/api'

const toast = useToastStore()
const auth = useAuthStore()
const keyword = ref('')
const loading = ref(false)
const tenants = ref<TenantVO[]>([])
const scopeTenants = ref<TenantVO[]>([])
const tenantPagination = ref<Pick<PageResult<TenantVO>, 'total' | 'current' | 'size'>>({
  total: 0,
  current: 1,
  size: 10,
})
const departments = ref<DepartmentVO[]>([])
const tenantFilter = ref('')
const statusFilter = ref('')
const isSuperAdmin = computed(() => auth.role === 'SUPER_ADMIN')
const currentTenantOption = computed(() =>
  auth.user?.tenantId
    ? {
        tenantId: auth.user.tenantId,
        name: auth.user.tenantName || auth.user.tenantId,
      }
    : null,
)
const departmentTenantOptions = computed(() =>
  isSuperAdmin.value
    ? scopeTenants.value.map((item) => ({ tenantId: item.tenantId, name: item.name }))
    : currentTenantOption.value
      ? [currentTenantOption.value]
      : [],
)
const activeTab = ref<'tenant' | 'department'>(isSuperAdmin.value ? 'tenant' : 'department')

const tenantModalOpen = ref(false)
const deptModalOpen = ref(false)
const tenantSubmitting = ref(false)
const deptSubmitting = ref(false)
const editingTenantId = ref<string | null>(null)
const editingDeptId = ref<string | null>(null)
const tenantForm = ref({ name: '', description: '' })
const deptForm = ref({ tenantId: '', name: '', description: '' })
let tenantSearchTimer: ReturnType<typeof setTimeout> | null = null

const filteredDepartments = computed(() =>
  departments.value.filter((item) => {
    const matchKeyword = !keyword.value.trim() || item.name.includes(keyword.value.trim())
    const matchTenant = isSuperAdmin.value
      ? (!tenantFilter.value || item.tenantId === tenantFilter.value)
      : item.tenantId === currentTenantOption.value?.tenantId
    return matchKeyword && matchTenant
  }),
)

function tenantName(tenantId: string) {
  return departmentTenantOptions.value.find((item) => item.tenantId === tenantId)?.name || tenantId
}

async function loadTenants() {
  if (!isSuperAdmin.value) {
    tenants.value = []
    tenantPagination.value = { ...tenantPagination.value, total: 0, current: 1 }
    return
  }
  const res = await tenantsApi.list({
    page: tenantPagination.value.current,
    size: tenantPagination.value.size,
    name: keyword.value.trim() || undefined,
    status: statusFilter.value || undefined,
  })
  tenants.value = res.records
  tenantPagination.value = {
    total: res.total,
    current: res.current,
    size: res.size,
  }
}

async function loadDepartments() {
  const res = await tenantsApi.viewOptions()
  scopeTenants.value = res.tenants || []
  departments.value = res.departments || []
}

async function reloadAll() {
  loading.value = true
  try {
    await loadTenants()
    await loadDepartments()
  } catch {
    toast.show('组织数据加载失败', 'err')
  } finally {
    loading.value = false
  }
}

function reloadTenantsOnly() {
  loading.value = true
  void loadTenants()
    .catch(() => toast.show('租户数据加载失败', 'err'))
    .finally(() => {
      loading.value = false
    })
}

function scheduleTenantSearch() {
  if (!isSuperAdmin.value || activeTab.value !== 'tenant') return
  if (tenantSearchTimer) clearTimeout(tenantSearchTimer)
  tenantSearchTimer = setTimeout(() => {
    tenantPagination.value.current = 1
    reloadTenantsOnly()
  }, 300)
}

function handleTenantPageChange(page: number) {
  tenantPagination.value.current = page
  reloadTenantsOnly()
}

function handleTenantPageSizeChange(size: number) {
  tenantPagination.value = { ...tenantPagination.value, current: 1, size }
  reloadTenantsOnly()
}

function openTenantModal(tenant?: TenantVO) {
  editingTenantId.value = tenant?.tenantId || null
  tenantForm.value = {
    name: tenant?.name || '',
    description: tenant?.description || '',
  }
  tenantModalOpen.value = true
}

function openDeptModal(dept?: DepartmentVO) {
  editingDeptId.value = dept?.deptId || null
  deptForm.value = {
    tenantId: dept?.tenantId || currentTenantOption.value?.tenantId || tenants.value[0]?.tenantId || '',
    name: dept?.name || '',
    description: dept?.description || '',
  }
  deptModalOpen.value = true
}

async function submitTenant() {
  if (!tenantForm.value.name.trim()) {
    toast.show('请输入租户名称', 'err')
    return
  }
  tenantSubmitting.value = true
  try {
    if (editingTenantId.value) {
      await tenantsApi.update(editingTenantId.value, tenantForm.value)
      toast.show('租户已更新', 'ok')
    } else {
      await tenantsApi.create(tenantForm.value)
      toast.show('租户已创建', 'ok')
    }
    tenantModalOpen.value = false
    await reloadAll()
  } catch {
    toast.show('租户保存失败', 'err')
  } finally {
    tenantSubmitting.value = false
  }
}

async function submitDepartment() {
  if (!deptForm.value.tenantId || !deptForm.value.name.trim()) {
    toast.show('请完整填写部门信息', 'err')
    return
  }
  deptSubmitting.value = true
  try {
    if (editingDeptId.value) {
      await tenantsApi.updateDepartment(editingDeptId.value, {
        name: deptForm.value.name,
        description: deptForm.value.description,
      })
      toast.show('部门已更新', 'ok')
    } else {
      await tenantsApi.createDepartment(deptForm.value.tenantId, {
        name: deptForm.value.name,
        description: deptForm.value.description,
      })
      toast.show('部门已创建', 'ok')
    }
    deptModalOpen.value = false
    await reloadAll()
  } catch {
    toast.show('部门保存失败', 'err')
  } finally {
    deptSubmitting.value = false
  }
}

async function toggleTenantStatus(tenant: TenantVO) {
  const targetStatus: TenantStatus = tenant.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  try {
    await tenantsApi.updateStatus(tenant.tenantId, targetStatus)
    toast.show(targetStatus === 'ACTIVE' ? '租户已启用' : '租户已停用', 'ok')
    await reloadAll()
  } catch {
    toast.show('租户状态更新失败', 'err')
  }
}

async function removeDepartment(deptId: string) {
  try {
    await tenantsApi.deleteDepartment(deptId)
    toast.show('部门已删除', 'ok')
    await reloadAll()
  } catch {
    toast.show('部门删除失败', 'err')
  }
}

onMounted(reloadAll)

watch(keyword, scheduleTenantSearch)
watch(statusFilter, scheduleTenantSearch)
watch(isSuperAdmin, (value) => {
  activeTab.value = value ? 'tenant' : 'department'
})
watch(activeTab, (tab) => {
  if (isSuperAdmin.value && tab === 'tenant') {
    reloadTenantsOnly()
  }
})

onBeforeUnmount(() => {
  if (tenantSearchTimer) clearTimeout(tenantSearchTimer)
})
</script>

<template>
  <section class="page">
    <PageHeader title="组织管理" subtitle="租户和部门两级组织结构管理，控制数据隔离边界">
      <BaseButton size="sm" variant="accent" @click="isSuperAdmin && activeTab === 'tenant' ? openTenantModal() : openDeptModal()">
        {{ isSuperAdmin && activeTab === 'tenant' ? '新建租户' : '新建部门' }}
      </BaseButton>
    </PageHeader>

    <div v-if="isSuperAdmin" class="tabs-row">
      <button class="tab-btn" :class="{ active: activeTab === 'tenant' }" @click="activeTab = 'tenant'">租户管理</button>
      <button class="tab-btn" :class="{ active: activeTab === 'department' }" @click="activeTab = 'department'">部门管理</button>
    </div>

    <SearchToolbar v-model="keyword" :placeholder="activeTab === 'tenant' ? '搜索租户名称...' : '搜索部门名称...'">
      <select v-if="isSuperAdmin && activeTab === 'tenant'" v-model="statusFilter" class="fsel">
        <option value="">全部状态</option>
        <option value="ACTIVE">启用</option>
        <option value="INACTIVE">停用</option>
      </select>
      <select v-else-if="isSuperAdmin" v-model="tenantFilter" class="fsel">
        <option value="">全部租户</option>
        <option v-for="tenant in tenants" :key="tenant.tenantId" :value="tenant.tenantId">{{ tenant.name }}</option>
      </select>
      <div class="tbrgt">
        <BaseButton size="sm" :loading="loading" @click="reloadAll">刷新</BaseButton>
      </div>
    </SearchToolbar>

    <div v-if="isSuperAdmin && activeTab === 'tenant'" class="tblwrap">
      <table>
        <thead><tr><th>租户名称</th><th class="hm">描述</th><th>部门数</th><th>账号数</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="tenant in tenants" :key="tenant.tenantId">
            <td><div class="cp">{{ tenant.name }}</div></td>
            <td class="hm cm">{{ tenant.description || '-' }}</td>
            <td>{{ tenant.deptCount }}</td>
            <td>{{ tenant.accountCount }}</td>
            <td><StatusPill v-bind="tenantStatusMeta(tenant.status)" /></td>
            <td class="cm whitespace-nowrap">{{ tenant.createdAt }}</td>
            <td>
              <div class="acts">
                <button class="a" @click="openTenantModal(tenant)">编辑</button>
                <span class="asep">|</span>
                <button class="a" @click="toggleTenantStatus(tenant)">{{ tenant.status === 'ACTIVE' ? '停用' : '启用' }}</button>
              </div>
            </td>
          </tr>
          <tr v-if="!tenants.length"><td colspan="7" class="cm text-center">暂无租户数据</td></tr>
        </tbody>
      </table>
    </div>

    <div v-else class="tblwrap">
      <table>
        <thead><tr><th>部门名称</th><th>所属租户</th><th class="hm">描述</th><th>账号数</th><th>创建时间</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="dept in filteredDepartments" :key="dept.deptId">
            <td><div class="cp">{{ dept.name }}</div></td>
            <td class="cm">{{ tenantName(dept.tenantId) }}</td>
            <td class="hm cm">{{ dept.description || '-' }}</td>
            <td>{{ dept.accountCount }}</td>
            <td class="cm whitespace-nowrap">{{ dept.createdAt }}</td>
            <td>
              <div class="acts">
                <button class="a" @click="openDeptModal(dept)">编辑</button>
                <span class="asep">|</span>
                <button class="a d" @click="removeDepartment(dept.deptId)">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!filteredDepartments.length"><td colspan="6" class="cm text-center">暂无部门数据</td></tr>
        </tbody>
      </table>
    </div>

    <PaginationBar
      v-if="isSuperAdmin && activeTab === 'tenant'"
      :total-text="`共 ${tenantPagination.total} 个租户`"
      :total="tenantPagination.total"
      :current="tenantPagination.current"
      :size="tenantPagination.size"
      :page-size-options="[10, 50, 100]"
      @update:current="handleTenantPageChange"
      @update:size="handleTenantPageSizeChange"
    />

    <AppModal :open="tenantModalOpen" :title="editingTenantId ? '编辑租户' : '新建租户'" @close="tenantModalOpen = false">
      <div class="field">
        <label>租户名称 <span class="req">*</span></label>
        <input v-model="tenantForm.name" type="text" placeholder="例如：华东子公司" />
      </div>
      <div class="field">
        <label>描述</label>
        <textarea v-model="tenantForm.description" placeholder="填写租户业务描述"></textarea>
      </div>
      <template #footer>
        <BaseButton @click="tenantModalOpen = false">取消</BaseButton>
        <BaseButton variant="primary" :loading="tenantSubmitting" @click="submitTenant">保存</BaseButton>
      </template>
    </AppModal>

    <AppModal :open="deptModalOpen" :title="editingDeptId ? '编辑部门' : '新建部门'" @close="deptModalOpen = false">
      <div class="field">
        <label>所属租户 <span class="req">*</span></label>
        <select v-if="isSuperAdmin" v-model="deptForm.tenantId" :disabled="!!editingDeptId">
          <option value="">请选择租户</option>
          <option v-for="tenant in departmentTenantOptions" :key="tenant.tenantId" :value="tenant.tenantId">{{ tenant.name }}</option>
        </select>
        <div v-else class="cm" style="padding: 7px 10px; border: 1px solid var(--border); border-radius: var(--r); background: var(--surface);">
          {{ currentTenantOption?.name || '当前租户' }}
        </div>
        <div v-if="!isSuperAdmin" class="field-hint">当前租户管理员仅可在本租户下新建部门。</div>
      </div>
      <div class="field">
        <label>部门名称 <span class="req">*</span></label>
        <input v-model="deptForm.name" type="text" placeholder="例如：财务部" />
      </div>
      <div class="field">
        <label>描述</label>
        <textarea v-model="deptForm.description" placeholder="填写部门职责"></textarea>
      </div>
      <template #footer>
        <BaseButton @click="deptModalOpen = false">取消</BaseButton>
        <BaseButton variant="primary" :loading="deptSubmitting" @click="submitDepartment">保存</BaseButton>
      </template>
    </AppModal>
  </section>
</template>
