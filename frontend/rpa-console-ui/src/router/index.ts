import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isMockEnabled } from '@/utils/runtime'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppShell.vue'),
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: () => import('@/views/dashboard/DashboardView.vue'), meta: { title: '概览' } },
        { path: 'org', name: 'org', component: () => import('@/views/org/OrgView.vue'), meta: { title: '组织管理' } },
        { path: 'accounts', name: 'accounts', component: () => import('@/views/account/AccountsView.vue'), meta: { title: '账号管理' } },
        { path: 'apps', name: 'apps', component: () => import('@/views/app/RpaAppsView.vue'), meta: { title: 'RPA 应用' } },
        { path: 'robots', name: 'robots', component: () => import('@/views/robot/RobotsView.vue'), meta: { title: '机器人管理' } },
        { path: 'tags', name: 'tags', component: () => import('@/views/tag/TagsView.vue'), meta: { title: '标签管理' } },
        { path: 'schedule/tasks', name: 'schedule-tasks', component: () => import('@/views/schedule/ScheduleTasksView.vue'), meta: { title: '调度任务' } },
        { path: 'schedule/executions', name: 'executions', component: () => import('@/views/schedule/ExecutionsView.vue'), meta: { title: '执行记录' } },
        { path: 'schedule/board', name: 'schedule-board', component: () => import('@/views/schedule/ScheduleBoardView.vue'), meta: { title: '排班看板' } },
        { path: 'roles', name: 'roles', component: () => import('@/views/role/RoleView.vue'), meta: { title: '角色权限' } },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (isMockEnabled && !auth.isAuthenticated && (to.query.demo === '1' || to.query.mockLogin === '1')) {
    auth.persist(`mock-token-${Date.now()}`, {
      accountId: 'mock-admin',
      name: 'Demo Administrator',
      loginAccount: 'admin@example.com',
      role: 'SUPER_ADMIN',
      tenantId: null,
      tenantName: null,
      deptId: null,
      deptName: null,
    })
  }
  if (!to.meta.public && !auth.isAuthenticated) return '/login'
  if (to.name === 'login' && auth.isAuthenticated) return '/dashboard'
  return true
})

export default router
