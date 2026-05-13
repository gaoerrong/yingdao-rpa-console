<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppToast from '@/components/base/AppToast.vue'
import StatusPill from '@/components/base/StatusPill.vue'
import { useAuthStore } from '@/stores/auth'
import { useViewScopeStore } from '@/stores/viewScope'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const viewScope = useViewScopeStore()
const sidebarOpen = ref(false)

const navGroups = [
  {
    key: 'schedule',
    label: '调度管理',
    section: '调度',
    icon: 'calendar',
    items: [
      { label: '调度任务', to: '/schedule/tasks' },
      { label: '执行记录', to: '/schedule/executions' },
      { label: '排班看板', to: '/schedule/board' },
    ],
  },
  {
    key: 'resource',
    label: '资源管理',
    section: '资源',
    icon: 'user',
    items: [
      { label: 'RPA 应用', to: '/apps' },
      { label: '机器人', to: '/robots' },
      { label: '标签管理', to: '/tags' },
    ],
  },
  {
    key: 'system',
    label: '系统管理',
    section: '系统',
    icon: 'settings',
    items: [
      { label: '账号管理', to: '/accounts' },
      { label: '组织管理', to: '/org' },
      { label: '角色权限', to: '/roles' },
    ],
  },
]

const openGroups = ref<Record<string, boolean>>({ schedule: true, resource: false, system: true })
const title = computed(() => String(route.meta.title || '概览'))
const userInitial = computed(() => auth.user?.role === 'SUPER_ADMIN' ? '超' : auth.user?.role === 'TENANT_ADMIN' ? '租' : '员')
const roleLabel = computed(() => auth.user?.role === 'SUPER_ADMIN' ? '超级管理员' : auth.user?.role === 'TENANT_ADMIN' ? '租户管理员' : '员工')
const roleTone = computed(() => auth.user?.role === 'SUPER_ADMIN' ? 'sa' : auth.user?.role === 'TENANT_ADMIN' ? 'ta' : 'mb')
const tenantDisabled = computed(() => !viewScope.allowTenantSwitch || viewScope.loading)
const deptDisabled = computed(() => !viewScope.allowDeptSwitch || viewScope.loading || !viewScope.selectedTenantId)

function isActive(path: string) {
  return route.path === path
}

function toggleGroup(key: string) {
  openGroups.value[key] = !openGroups.value[key]
}

async function logout() {
  await auth.logout()
  viewScope.clear()
  await router.push('/login')
}

async function handleTenantChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  await viewScope.setTenant(value || null)
}

function handleDeptChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  viewScope.setDepartment(value || null)
}

onMounted(() => {
  void viewScope.initialize()
})
</script>

<template>
  <div class="mob-ov" :class="{ show: sidebarOpen }" @click="sidebarOpen = false"></div>
  <div class="app-shell">
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="brand">
        <div class="brand-ico">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" />
            <path d="M9 11.5h5M11.5 9v5" />
          </svg>
        </div>
        <div>
          <div class="brand-name">RPA Console</div>
          <div class="brand-sub">企业自动化管理平台</div>
        </div>
      </div>

      <nav class="nav">
        <RouterLink class="ni" :class="{ active: isActive('/dashboard') }" to="/dashboard" @click="sidebarOpen = false">
          <svg viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
            <rect x="1.5" y="1.5" width="5" height="5" rx=".8" />
            <rect x="8.5" y="1.5" width="5" height="5" rx=".8" />
            <rect x="1.5" y="8.5" width="5" height="5" rx=".8" />
            <rect x="8.5" y="8.5" width="5" height="5" rx=".8" />
          </svg>
          概览
        </RouterLink>

        <template v-for="group in navGroups" :key="group.key">
          <div class="nav-sec">{{ group.section }}</div>
          <button class="ni" :class="{ open: openGroups[group.key] }" @click="toggleGroup(group.key)">
            <svg v-if="group.icon === 'calendar'" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
              <rect x="1.5" y="2" width="12" height="11" rx="1.2" />
              <path d="M4.5 1v2M10.5 1v2M1.5 5.5h12M5 8.5h2M8 8.5h2M5 11h2" />
            </svg>
            <svg v-else-if="group.icon === 'user'" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
              <circle cx="7.5" cy="5" r="3" />
              <path d="M1.5 13.5c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            </svg>
            <svg v-else viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
              <circle cx="7.5" cy="7.5" r="2" />
              <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.2 3.2l1 1M10.8 10.8l1 1M10.8 3.2l-1 1M4.2 10.8l-1 1" />
            </svg>
            {{ group.label }}
            <svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
              <path d="M4 4.5l3 3 3-3" />
            </svg>
          </button>
          <div class="nsub" :class="{ open: openGroups[group.key] }">
            <RouterLink
              v-for="item in group.items"
              :key="item.to"
              class="nsi"
              :class="{ active: isActive(item.to) }"
              :to="item.to"
              @click="sidebarOpen = false"
            >
              <span class="ndot"></span>{{ item.label }}
            </RouterLink>
          </div>
        </template>
      </nav>

      <div class="sfoot">
        <div class="avt" :class="{ sa: auth.user?.role === 'SUPER_ADMIN' }">{{ userInitial }}</div>
        <div>
          <div class="uname">{{ auth.user?.name || '未登录' }}</div>
          <StatusPill :label="roleLabel" :tone="roleTone" />
        </div>
        <button class="logout-btn" @click="logout">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M5.5 2h-2a1 1 0 00-1 1v8a1 1 0 001 1h2M8 4l3 3-3 3M11 7H5" />
          </svg>
        </button>
      </div>
    </aside>

    <header class="header">
      <button class="hbg" @click="sidebarOpen = true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M2 4h12M2 8h12M2 12h12" />
        </svg>
      </button>
      <div class="bc">
        <span>控制台</span><span class="sep">/</span><span class="cur">{{ title }}</span>
      </div>
      <div class="hrgt">
        <div class="hdr-sel-group">
          <div class="hdr-sel-wrap">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
              <rect x="1" y="1.5" width="10" height="9" rx=".8" />
              <path d="M1 4.5h10M4.5 1.5v3M7.5 1.5v3" />
            </svg>
            <select :value="viewScope.selectedTenantId || ''" class="hdr-sel" :disabled="tenantDisabled" @change="handleTenantChange">
              <option v-if="viewScope.allowTenantSwitch" value="">全部租户</option>
              <option v-for="tenant in viewScope.tenantOptions" :key="tenant.tenantId" :value="tenant.tenantId">{{ tenant.name }}</option>
            </select>
            <svg class="hdr-caret" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2 4l3 3 3-3" /></svg>
          </div>
          <div class="hdr-sel-divider"></div>
          <div class="hdr-sel-wrap">
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
              <path d="M6 1a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
              <path d="M1 11c0-2.8 2.2-5 5-5s5 2.2 5 5" />
            </svg>
            <select :value="viewScope.selectedDeptId || ''" class="hdr-sel" :disabled="deptDisabled" @change="handleDeptChange">
              <option value="">全部部门</option>
              <option v-for="department in viewScope.departmentOptions" :key="department.deptId" :value="department.deptId">{{ department.name }}</option>
            </select>
            <svg class="hdr-caret" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2 4l3 3 3-3" /></svg>
          </div>
        </div>
        <div class="havt" :class="{ sa: auth.user?.role === 'SUPER_ADMIN' }">{{ userInitial }}</div>
      </div>
    </header>

    <main class="content">
      <RouterView :key="viewScope.scopeKey" />
    </main>
  </div>
  <AppToast />
</template>
