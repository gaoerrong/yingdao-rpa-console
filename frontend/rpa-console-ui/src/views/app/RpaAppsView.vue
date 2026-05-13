<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppDrawer from '@/components/base/AppDrawer.vue'
import AppModal from '@/components/base/AppModal.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import PageHeader from '@/components/base/PageHeader.vue'
import SearchToolbar from '@/components/base/SearchToolbar.vue'
import StatusPill from '@/components/base/StatusPill.vue'
import { rpaAppsApi } from '@/api/rpaApps'
import { tagsApi } from '@/api/tags'
import { tenantsApi } from '@/api/tenants'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useViewScopeStore } from '@/stores/viewScope'
import { tagClass } from '@/utils/format'
import type { DepartmentVO, RpaAppDetailVO, RpaAppVO, TagVO, TenantVO } from '@/types/api'

const toast = useToastStore()
const auth = useAuthStore()
const viewScope = useViewScopeStore()
const rows = ref<RpaAppVO[]>([])
const keyword = ref('')
const syncLoading = ref(false)
const loading = ref(false)
const lastSync = ref('最后同步: -')
const detailOpen = ref(false)
const detail = ref<RpaAppDetailVO | null>(null)
const detailLoading = ref(false)
const mappingOpen = ref(false)
const mappingSubmitting = ref(false)
const currentAppId = ref('')
const currentApp = ref<RpaAppVO | null>(null)
const tenants = ref<TenantVO[]>([])
const departments = ref<DepartmentVO[]>([])
const tags = ref<TagVO[]>([])
const mappingForm = ref({ tenantId: '', deptId: '' })
const tagModalOpen = ref(false)
const tagSaving = ref(false)
const selectedTagIds = ref<string[]>([])
const isSuperAdmin = computed(() => auth.role === 'SUPER_ADMIN')
const currentTenantOption = computed(() =>
  auth.user?.tenantId
    ? {
        tenantId: auth.user.tenantId,
        name: auth.user.tenantName || auth.user.tenantId,
      }
    : null,
)

const filteredRows = computed(() =>
  rows.value.filter((app) => !keyword.value.trim() || app.name.includes(keyword.value.trim())),
)

const availableDepartments = computed(() =>
  departments.value.filter((item) => item.tenantId === mappingForm.value.tenantId),
)

async function loadApps() {
  loading.value = true
  try {
    const res = await rpaAppsApi.list({ page: 1, size: 100 })
    rows.value = res.records
    const latest = res.records[0]?.syncedAt
    lastSync.value = latest ? `最后同步: ${new Date(latest).toLocaleString()}` : '最后同步: -'
  } catch {
    toast.show('应用数据加载失败', 'err')
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  try {
    if (isSuperAdmin.value) {
      const tenantRes = await tenantsApi.list({ page: 1, size: 200 })
      tenants.value = tenantRes.records
      departments.value = (await Promise.all(tenants.value.map((tenant) => tenantsApi.departments(tenant.tenantId)))).flat()
    } else {
      const tenantId = currentTenantOption.value?.tenantId
      tenants.value = tenantId ? [{ tenantId, name: currentTenantOption.value?.name || tenantId, description: null, status: 'ACTIVE', deptCount: 0, accountCount: 0, createdAt: '' }] : []
      departments.value = viewScope.departmentOptions.length && viewScope.selectedTenantId === tenantId
        ? viewScope.departmentOptions
        : tenantId
          ? await tenantsApi.departments(tenantId)
          : []
    }
    tags.value = await tagsApi.list()
  } catch {
    toast.show('应用配置项加载失败', 'err')
  }
}

async function syncApps() {
  syncLoading.value = true
  try {
    const res = await rpaAppsApi.sync()
    lastSync.value = `最后同步: ${new Date(res.lastSyncTime).toLocaleString()}`
    toast.show(`同步成功，共同步 ${res.synced} 个应用`, 'ok')
    await loadApps()
    if (detailOpen.value && detail.value) {
      await openDetail(detail.value.appId)
    }
  } catch {
    toast.show('应用同步失败', 'err')
  } finally {
    syncLoading.value = false
  }
}

async function openDetail(appId: string) {
  detailOpen.value = true
  detailLoading.value = true
  try {
    detail.value = await rpaAppsApi.detail(appId)
  } catch {
    toast.show('应用详情加载失败', 'err')
  } finally {
    detailLoading.value = false
  }
}

function openMapping(app: RpaAppVO) {
  currentApp.value = app
  currentAppId.value = app.appId
  mappingForm.value = {
    tenantId: isSuperAdmin.value ? '' : currentTenantOption.value?.tenantId || '',
    deptId: '',
  }
  mappingOpen.value = true
}

function openTagModal(app: RpaAppVO) {
  currentApp.value = app
  selectedTagIds.value = app.tags.map((item) => item.tagId)
  tagModalOpen.value = true
}

async function submitMapping() {
  if (!currentAppId.value || (!isSuperAdmin.value && !currentTenantOption.value?.tenantId)) {
    toast.show('当前租户信息缺失', 'err')
    return
  }
  if (isSuperAdmin.value && !mappingForm.value.tenantId) {
    toast.show('请选择租户', 'err')
    return
  }
  mappingSubmitting.value = true
  try {
    await rpaAppsApi.createMapping(currentAppId.value, {
      tenantId: mappingForm.value.tenantId,
      deptId: mappingForm.value.deptId || null,
    })
    toast.show('租户关联已创建', 'ok')
    mappingOpen.value = false
    await loadApps()
  } catch {
    toast.show('租户关联创建失败', 'err')
  } finally {
    mappingSubmitting.value = false
  }
}

async function saveTags() {
  if (!currentApp.value) return
  tagSaving.value = true
  try {
    await tagsApi.setResourceTags({
      resourceType: 'RPA_APP',
      resourceId: currentApp.value.appId,
      tagIds: selectedTagIds.value,
    })
    toast.show('应用标签已更新', 'ok')
    tagModalOpen.value = false
    await loadApps()
    if (detailOpen.value && detail.value?.appId === currentApp.value.appId) {
      await openDetail(currentApp.value.appId)
    }
  } catch {
    toast.show('应用标签更新失败', 'err')
  } finally {
    tagSaving.value = false
  }
}

async function removeMapping(mappingId: string) {
  try {
    await rpaAppsApi.deleteMapping(mappingId)
    toast.show('关联已移除', 'ok')
    await loadApps()
    if (detail.value) await openDetail(detail.value.appId)
  } catch {
    toast.show('关联移除失败', 'err')
  }
}

onMounted(async () => {
  await Promise.all([loadApps(), loadOptions()])
})
</script>

<template>
  <section class="page">
    <PageHeader title="RPA 应用" subtitle="同步影刀侧 RPA 应用，关联租户/部门后可在调度任务中使用">
      <BaseButton size="sm" :loading="syncLoading" @click="syncApps">手动同步</BaseButton>
    </PageHeader>
    <SearchToolbar v-model="keyword" placeholder="搜索应用名称...">
      <div class="tbrgt"><span class="sync-info">{{ lastSync }}</span></div>
    </SearchToolbar>
    <div class="tblwrap">
      <table>
        <thead><tr><th class="w-9"><input type="checkbox" /></th><th>应用名称</th><th class="hm">应用版本</th><th class="hm">所有者</th><th>归属租户</th><th class="hm">归属部门</th><th>支持参数</th><th class="hm">标签</th><th>状态</th><th class="w-40">操作</th></tr></thead>
        <tbody>
          <tr v-for="app in filteredRows" :key="app.appId" :class="{ 'opacity-65': app.status === 'EXPIRED' }">
            <td><input type="checkbox" /></td>
            <td><div class="cp">{{ app.name }}</div></td>
            <td class="hm cm">{{ app.version || '-' }}</td>
            <td class="hm"><span class="cmono">{{ app.ownerName || '-' }}</span></td>
            <td class="cm">{{ app.tenantMappings[0]?.tenantName || '-' }}</td>
            <td class="hm cm">{{ app.tenantMappings[0]?.deptName || '-' }}</td>
            <td><StatusPill :label="app.supportParam ? '支持' : '不支持'" :tone="app.supportParam ? 'ok' : 'off'" /></td>
            <td class="hm"><div class="tags"><span v-for="(tag, index) in app.tags" :key="tag.tagId" class="tag" :class="tagClass(index)">{{ tag.name }}</span></div></td>
            <td><StatusPill :label="app.status === 'ACTIVE' ? '正常' : '已失效'" :tone="app.status === 'ACTIVE' ? 'ok' : 'err'" /></td>
            <td><div class="acts"><button class="a" @click="openMapping(app)">关联租户</button><span class="asep">|</span><button class="a" @click="openTagModal(app)">标签</button><span class="asep">|</span><button class="a" @click="openDetail(app.appId)">查看参数</button></div></td>
          </tr>
          <tr v-if="!filteredRows.length"><td colspan="10" class="cm text-center">暂无应用数据</td></tr>
        </tbody>
      </table>
    </div>
    <div class="pgn"><span class="pgni">共 {{ filteredRows.length }} 个应用</span></div>

    <AppDrawer :open="detailOpen" title="应用详情" @close="detailOpen = false">
      <div v-if="detailLoading" class="cm">加载中...</div>
      <template v-else-if="detail">
        <div class="field"><label>应用名称</label><div>{{ detail.name }}</div></div>
        <div class="field"><label>租户关联</label>
          <div class="flex flex-col gap-2">
            <div v-for="mapping in detail.tenantMappings" :key="mapping.mappingId" class="flex items-center justify-between rounded border border-[var(--border)] px-3 py-2">
              <span class="cm">{{ mapping.tenantName }} / {{ mapping.deptName || '全部部门' }}</span>
              <button class="a d" @click="removeMapping(mapping.mappingId)">移除</button>
            </div>
          </div>
        </div>
        <div class="field"><label>输入参数</label><pre class="cm">{{ JSON.stringify(detail.inputParams, null, 2) }}</pre></div>
        <div class="field"><label>输出参数</label><pre class="cm">{{ JSON.stringify(detail.outputParams, null, 2) }}</pre></div>
      </template>
      <template #footer>
        <BaseButton @click="detailOpen = false">关闭</BaseButton>
      </template>
    </AppDrawer>

    <AppModal :open="mappingOpen" title="关联租户 / 部门" @close="mappingOpen = false">
      <div class="field">
        <label>租户 <span class="req">*</span></label>
        <select v-if="isSuperAdmin" v-model="mappingForm.tenantId">
          <option value="">请选择租户</option>
          <option v-for="tenant in tenants" :key="tenant.tenantId" :value="tenant.tenantId">{{ tenant.name }}</option>
        </select>
        <div v-else class="field-static">{{ currentTenantOption?.name || '当前租户' }}</div>
      </div>
      <div class="field">
        <label>部门</label>
        <select v-model="mappingForm.deptId" :disabled="!mappingForm.tenantId">
          <option value="">全部部门</option>
          <option v-for="dept in availableDepartments" :key="dept.deptId" :value="dept.deptId">{{ dept.name }}</option>
        </select>
      </div>
      <template #footer>
        <BaseButton @click="mappingOpen = false">取消</BaseButton>
        <BaseButton variant="primary" :loading="mappingSubmitting" @click="submitMapping">保存</BaseButton>
      </template>
    </AppModal>

    <AppModal :open="tagModalOpen" title="关联标签" @close="tagModalOpen = false">
      <div class="field">
        <label>标签</label>
        <div v-if="tags.length" class="grid grid-cols-2 gap-2">
          <label
            v-for="tag in tags"
            :key="tag.tagId"
            class="inline-flex items-center gap-2 rounded border px-2 py-2 text-sm"
            :style="selectedTagIds.includes(tag.tagId)
              ? { backgroundColor: `${tag.color}20`, borderColor: tag.color, color: tag.color }
              : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }"
          >
            <input v-model="selectedTagIds" type="checkbox" :value="tag.tagId" />
            <span class="inline-block h-2 w-2 rounded-full" :style="{ backgroundColor: tag.color }"></span>
            <span>{{ tag.name }}</span>
          </label>
        </div>
        <div v-else class="field-static">暂无可用标签</div>
      </div>
      <template #footer>
        <BaseButton @click="tagModalOpen = false">取消</BaseButton>
        <BaseButton variant="primary" :loading="tagSaving" @click="saveTags">保存</BaseButton>
      </template>
    </AppModal>
  </section>
</template>
