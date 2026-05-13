<script setup lang="ts">
import PageHeader from '@/components/base/PageHeader.vue'
import StatusPill from '@/components/base/StatusPill.vue'

const roles = [
  {
    name: '超级管理员',
    tone: 'sa' as const,
    description: '全局查看与管理所有租户、账号、应用和平台配置。',
    abilities: ['创建租户', '查看全量数据', '分配租户管理员', '执行全局同步'],
  },
  {
    name: '租户管理员',
    tone: 'ta' as const,
    description: '仅管理本租户组织和资源归属，不可跨租户操作。',
    abilities: ['创建部门', '分配账号与应用', '查看本租户任务', '维护标签'],
  },
  {
    name: '员工',
    tone: 'mb' as const,
    description: '查看本租户或本部门资源，配置并触发授权范围内调度任务。',
    abilities: ['查看任务和执行记录', '手动触发任务', '查看排班看板', '查看 Dashboard'],
  },
]
</script>

<template>
  <section class="page scroll-page">
    <PageHeader title="角色权限" subtitle="内置三类角色，权限矩阵由租户和部门归属共同决定" />
    <div class="role-grid">
      <div v-for="role in roles" :key="role.name" class="role-card">
        <div class="role-head">
          <StatusPill :label="role.name" :tone="role.tone" />
        </div>
        <div class="role-body">
          <div class="cm mb-3">{{ role.description }}</div>
          <div class="role-list">
            <div v-for="ability in role.abilities" :key="ability" class="role-line">
              <span class="ok-text">✓</span><span>{{ ability }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
