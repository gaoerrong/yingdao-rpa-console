import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { tenantsApi } from '@/api/tenants'
import type { DepartmentVO, TenantVO } from '@/types/api'

const tenantKey = 'rpa-console-view-tenant-id'
const deptKey = 'rpa-console-view-dept-id'

export const useViewScopeStore = defineStore('viewScope', () => {
  const loading = ref(false)
  const tenantOptions = ref<TenantVO[]>([])
  const departmentOptions = ref<DepartmentVO[]>([])
  const selectedTenantId = ref<string | null>(localStorage.getItem(tenantKey) || null)
  const selectedDeptId = ref<string | null>(localStorage.getItem(deptKey) || null)
  const allowTenantSwitch = ref(false)
  const allowDeptSwitch = ref(false)

  const scopeKey = computed(() => `${selectedTenantId.value || 'all'}:${selectedDeptId.value || 'all'}`)
  const selectedTenant = computed(() => tenantOptions.value.find((item) => item.tenantId === selectedTenantId.value) || null)
  const selectedDepartment = computed(() => departmentOptions.value.find((item) => item.deptId === selectedDeptId.value) || null)

  function persist() {
    persistValue(tenantKey, selectedTenantId.value)
    persistValue(deptKey, selectedDeptId.value)
  }

  async function initialize() {
    loading.value = true
    try {
      const options = await tenantsApi.viewOptions()
      tenantOptions.value = options.tenants || []
      departmentOptions.value = options.departments || []
      allowTenantSwitch.value = options.allowTenantSwitch
      allowDeptSwitch.value = options.allowDeptSwitch
      selectedTenantId.value = validTenant(selectedTenantId.value) ? selectedTenantId.value : options.selectedTenantId || null
      if (selectedTenantId.value && allowTenantSwitch.value) {
        await loadDepartments(selectedTenantId.value, false)
      }
      selectedDeptId.value = validDepartment(selectedDeptId.value) ? selectedDeptId.value : options.selectedDeptId || null
      persist()
    } finally {
      loading.value = false
    }
  }

  async function setTenant(tenantId: string | null) {
    selectedTenantId.value = tenantId || null
    selectedDeptId.value = null
    departmentOptions.value = []
    if (selectedTenantId.value) {
      await loadDepartments(selectedTenantId.value, true)
    }
    persist()
  }

  function setDepartment(deptId: string | null) {
    selectedDeptId.value = deptId || null
    persist()
  }

  async function loadDepartments(tenantId: string, keepSelected: boolean) {
    departmentOptions.value = await tenantsApi.departments(tenantId)
    if (!keepSelected && selectedDeptId.value && !validDepartment(selectedDeptId.value)) {
      selectedDeptId.value = null
    }
  }

  function clear() {
    tenantOptions.value = []
    departmentOptions.value = []
    selectedTenantId.value = null
    selectedDeptId.value = null
    allowTenantSwitch.value = false
    allowDeptSwitch.value = false
    localStorage.removeItem(tenantKey)
    localStorage.removeItem(deptKey)
  }

  function validTenant(tenantId: string | null) {
    return tenantId != null && tenantOptions.value.some((item) => item.tenantId === tenantId)
  }

  function validDepartment(deptId: string | null) {
    return deptId != null && departmentOptions.value.some((item) => item.deptId === deptId)
  }

  return {
    loading,
    tenantOptions,
    departmentOptions,
    selectedTenantId,
    selectedDeptId,
    allowTenantSwitch,
    allowDeptSwitch,
    scopeKey,
    selectedTenant,
    selectedDepartment,
    initialize,
    setTenant,
    setDepartment,
    clear,
  }
})

function persistValue(key: string, value: string | null) {
  if (value) {
    localStorage.setItem(key, value)
  } else {
    localStorage.removeItem(key)
  }
}
