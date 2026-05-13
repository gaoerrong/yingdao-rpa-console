<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { isMockEnabled } from '@/utils/runtime'

const router = useRouter()
const auth = useAuthStore()
const activeTab = ref<'pwd' | 'sso'>('sso')
const loginAccount = ref('')
const password = ref('')
const showPwd = ref(false)
const loading = ref(false)
const error = ref('')
const accountTouched = ref(false)
const passwordTouched = ref(false)

function switchTab(tab: 'pwd' | 'sso') {
  activeTab.value = tab
  error.value = ''
}

async function simulateSSO() {
  loading.value = true
  await new Promise((resolve) => window.setTimeout(resolve, 700))
  await auth.ssoDemoLogin()
  await router.push('/dashboard')
}

async function doLogin() {
  accountTouched.value = true
  passwordTouched.value = true
  error.value = ''
  if (!loginAccount.value.trim() || !password.value.trim()) return
  loading.value = true
  try {
    await auth.login({ loginAccount: loginAccount.value.trim(), password: password.value })
    await router.push('/dashboard')
  } catch {
    error.value = isMockEnabled
      ? 'Mock 模式登录失败，请确认账号和密码已填写'
      : password.value === '123456'
        ? '账号不存在，请确认后重试'
        : '密码错误，初始密码为 123456'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <section class="login-left">
      <div class="lp-brand">
        <div class="lp-ico">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <rect x="2" y="2" width="6" height="6" rx="1" />
            <rect x="10" y="2" width="6" height="6" rx="1" />
            <rect x="2" y="10" width="6" height="6" rx="1" />
            <path d="M10 13h6M13 10v6" />
          </svg>
        </div>
        <div>
          <div class="lp-name">RPA Console</div>
          <div class="lp-sub">企业自动化管理平台</div>
        </div>
      </div>

      <div class="lp-hero">
        <div class="lp-tag">Enterprise RPA</div>
        <div class="lp-title">统一管理<br />您的自动化资源</div>
        <div class="lp-desc">跨子公司、跨部门的 RPA 资源精细化管理。调度任务、机器人、账号权限，全部在同一平台完成。</div>
      </div>

      <div class="lp-features">
        <div class="lp-feat"><span class="lp-feat-dot"></span>多租户 + 部门两级隔离，数据严格不跨边界</div>
        <div class="lp-feat"><span class="lp-feat-dot"></span>调度任务配置、触发、停止、日志全流程闭环</div>
        <div class="lp-feat"><span class="lp-feat-dot"></span>机器人实时状态监控 · 5 分钟心跳同步</div>
        <div class="lp-feat"><span class="lp-feat-dot"></span>云日志 / 云录屏可下载，全量执行记录可审计</div>
      </div>
    </section>

    <section class="login-right">
      <div class="login-head">
        <div class="login-title">欢迎回来</div>
        <div class="login-sub">登录后进入企业 RPA 管理控制台</div>
      </div>

      <div class="login-tabs">
        <button class="login-tab" :class="{ active: activeTab === 'pwd' }" @click="switchTab('pwd')">账号密码登录</button>
        <button class="login-tab" :class="{ active: activeTab === 'sso' }" @click="switchTab('sso')">企业 SSO 登录</button>
      </div>

      <div v-if="activeTab === 'sso'">
        <button class="sso-btn" :disabled="loading" @click="simulateSSO">
          <span v-if="loading" class="spin"></span>
          <span v-else class="sso-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <rect x="1" y="3" width="10" height="7" rx="1" />
              <path d="M4 3V2a2 2 0 014 0v1" />
            </svg>
          </span>
          {{ loading ? '正在跳转至企业 SSO...' : '通过企业 SSO 系统登录' }}
        </button>

        <div class="sso-hint">
          点击后将跳转至企业统一认证系统（OAuth 2.0）<br />授权完成后自动返回并完成登录<br /><br />
          <strong class="text-fg">当前演示环境</strong>：SSO 跳转已模拟，点击后直接进入系统
        </div>

        <div class="divider"><span class="divider-text">或使用账号密码登录</span></div>

        <button class="btn-submit !bg-surface !text-fg border border-border" @click="switchTab('pwd')">切换到账号密码登录</button>
      </div>

      <form v-else @submit.prevent="doLogin">
        <div v-if="error" class="err-banner">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
            <circle cx="7" cy="7" r="5.5" />
            <path d="M7 4.5v3M7 9.5v.5" />
          </svg>
          <span>{{ error }}</span>
        </div>

        <div class="field">
          <label>登录账号</label>
            <input
              v-model="loginAccount"
              type="text"
              :placeholder="isMockEnabled ? '输入演示账号（如：admin@example.com）' : '输入影刀登录账号（如：admin@ydcs）'"
              autocomplete="username"
            />
          <div v-if="accountTouched && !loginAccount.trim()" class="field-err">请输入登录账号</div>
        </div>

        <div class="field">
          <label>密码</label>
          <div class="relative">
            <input v-model="password" :type="showPwd ? 'text' : 'password'" placeholder="输入密码" autocomplete="current-password" />
            <button type="button" class="absolute right-2 top-2 text-muted" @click="showPwd = !showPwd">
              <svg v-if="!showPwd" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
                <ellipse cx="7" cy="7" rx="5.5" ry="3.5" />
                <circle cx="7" cy="7" r="1.5" />
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
                <path d="M1 7s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" />
                <path d="M2 2l10 10" />
              </svg>
            </button>
          </div>
          <div class="field-hint">
            <template v-if="isMockEnabled">
              Mock 模式可使用任意账号与任意非空密码
            </template>
            <template v-else>
              初始密码为 <span class="cmono">123456</span>，首次登录建议修改
            </template>
          </div>
          <div v-if="passwordTouched && !password.trim()" class="field-err">请输入密码</div>
        </div>

        <button class="btn-submit" :disabled="loading" type="submit">
          <span v-if="loading" class="spin light"></span>
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="login-footer">
        <span>RPA Console v1.4</span>
        <div class="footer-links">
          <a class="link-muted" href="#">使用帮助</a>
          <a class="link-muted" href="#">联系支持</a>
        </div>
      </div>
    </section>
  </div>
</template>
