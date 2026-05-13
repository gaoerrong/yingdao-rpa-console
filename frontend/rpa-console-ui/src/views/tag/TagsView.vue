<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppModal from '@/components/base/AppModal.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import PageHeader from '@/components/base/PageHeader.vue'
import PaginationBar from '@/components/base/PaginationBar.vue'
import SearchToolbar from '@/components/base/SearchToolbar.vue'
import { tagsApi } from '@/api/tags'
import { useToastStore } from '@/stores/toast'
import { tagClass } from '@/utils/format'
import type { PageResult, TagVO } from '@/types/api'

const toast = useToastStore()
const keyword = ref('')
const tags = ref<TagVO[]>([])
const loading = ref(false)
const pagination = ref<Pick<PageResult<TagVO>, 'total' | 'current' | 'size'>>({
  total: 0,
  current: 1,
  size: 10,
})
const modalOpen = ref(false)
const submitting = ref(false)
const editingTagId = ref<string | null>(null)
const defaultColor = '#22c55e'
const baseColorOptions = [
  { label: '绿色', value: '#22c55e' },
  { label: '橙色', value: '#f59e0b' },
  { label: '蓝色', value: '#3b82f6' },
  { label: '灰色', value: '#6b7280' },
  { label: '红色', value: '#ef4444' },
  { label: '紫色', value: '#a855f7' },
]
const form = ref({ name: '', color: defaultColor, description: '' })
let searchTimer: ReturnType<typeof setTimeout> | null = null

async function loadTags() {
  loading.value = true
  try {
    const res = await tagsApi.listPage({
      page: pagination.value.current,
      size: pagination.value.size,
      keyword: keyword.value.trim() || undefined,
    })
    tags.value = res.records
    pagination.value = {
      total: res.total,
      current: res.current,
      size: res.size,
    }
  } catch {
    toast.show('标签数据加载失败', 'err')
  } finally {
    loading.value = false
  }
}

function openModal(tag?: TagVO) {
  editingTagId.value = tag?.tagId || null
  form.value = {
    name: tag?.name || '',
    color: tag?.color || defaultColor,
    description: tag?.description || '',
  }
  modalOpen.value = true
}

function colorOptions(color: string) {
  const options = [...baseColorOptions]
  if (color && !options.some((item) => item.value === color)) {
    options.unshift({ label: `当前颜色 (${color})`, value: color })
  }
  return options
}

async function submitTag() {
  if (!form.value.name.trim()) {
    toast.show('请输入标签名称', 'err')
    return
  }
  submitting.value = true
  try {
    if (editingTagId.value) {
      await tagsApi.update(editingTagId.value, form.value)
      toast.show('标签已更新', 'ok')
    } else {
      await tagsApi.create(form.value)
      toast.show('标签已创建', 'ok')
    }
    modalOpen.value = false
    await loadTags()
  } catch {
    toast.show('标签保存失败', 'err')
  } finally {
    submitting.value = false
  }
}

async function removeTag(tagId: string) {
  try {
    await tagsApi.delete(tagId)
    toast.show('标签已删除', 'ok')
    await loadTags()
  } catch {
    toast.show('标签删除失败', 'err')
  }
}

function scheduleKeywordSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pagination.value.current = 1
    void loadTags()
  }, 300)
}

function handlePageChange(page: number) {
  pagination.value.current = page
  void loadTags()
}

function handlePageSizeChange(size: number) {
  pagination.value = { ...pagination.value, current: 1, size }
  void loadTags()
}

onMounted(loadTags)

watch(keyword, scheduleKeywordSearch)

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <section class="page">
    <PageHeader title="标签管理" subtitle="统一管理资源标签，支持账号、应用、机器人与调度任务归类">
      <BaseButton size="sm" variant="accent" @click="openModal()">新建标签</BaseButton>
    </PageHeader>
    <SearchToolbar v-model="keyword" placeholder="搜索标签名称...">
      <div class="tbrgt"><BaseButton size="sm" :loading="loading" @click="loadTags">刷新</BaseButton></div>
    </SearchToolbar>
    <div class="tblwrap">
      <table>
        <thead><tr><th>标签</th><th class="hm">说明</th><th>账号</th><th>应用</th><th>机器人</th><th>任务</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="(tag, index) in tags" :key="tag.tagId">
            <td>
              <div class="tags"><span class="tag" :class="tagClass(index)" :style="{ backgroundColor: `${tag.color}20`, color: tag.color }">{{ tag.name }}</span></div>
            </td>
            <td class="hm cm">{{ tag.description || '-' }}</td>
            <td>{{ tag.accountCount }}</td>
            <td>{{ tag.appCount }}</td>
            <td>{{ tag.robotCount }}</td>
            <td>{{ tag.taskCount }}</td>
            <td>
              <div class="acts">
                <button class="a" @click="openModal(tag)">编辑</button>
                <span class="asep">|</span>
                <button class="a d" @click="removeTag(tag.tagId)">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!tags.length"><td colspan="7" class="cm text-center">暂无标签数据</td></tr>
        </tbody>
      </table>
    </div>
    <PaginationBar
      :total-text="`共 ${pagination.total} 个标签`"
      :total="pagination.total"
      :current="pagination.current"
      :size="pagination.size"
      :page-size-options="[10, 50, 100]"
      @update:current="handlePageChange"
      @update:size="handlePageSizeChange"
    />

    <AppModal :open="modalOpen" :title="editingTagId ? '编辑标签' : '新建标签'" @close="modalOpen = false">
      <div class="field">
        <label>标签名称 <span class="req">*</span></label>
        <input v-model="form.name" type="text" placeholder="例如：财务" />
      </div>
      <div class="field">
        <label>颜色</label>
        <div class="flex items-center gap-2">
          <select v-model="form.color" style="flex: 1; min-width: 0">
            <option v-for="option in colorOptions(form.color)" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <span class="tag" :style="{ backgroundColor: `${form.color}20`, color: form.color, flexShrink: 0 }">
            {{ form.color }}
          </span>
        </div>
        <div class="field-hint">选择预设颜色即可，系统会自动保存对应色值。</div>
      </div>
      <div class="field">
        <label>说明</label>
        <textarea v-model="form.description" placeholder="填写标签用途"></textarea>
      </div>
      <template #footer>
        <BaseButton @click="modalOpen = false">取消</BaseButton>
        <BaseButton variant="primary" :loading="submitting" @click="submitTag">保存</BaseButton>
      </template>
    </AppModal>
  </section>
</template>
