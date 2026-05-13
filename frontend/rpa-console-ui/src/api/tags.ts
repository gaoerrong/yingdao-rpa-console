import { apiDelete, apiGet, apiPost, apiPut } from '@/utils/request'
import type { PageResult, ResourceType, TagVO } from '@/types/api'

export const tagsApi = {
  list() {
    return apiGet<TagVO[]>('/api/v1/tags')
  },
  listPage(params?: Record<string, unknown>) {
    return apiGet<PageResult<TagVO>>('/api/v1/tags/page', { params })
  },
  create(payload: { name: string; color?: string; description?: string | null }) {
    return apiPost<TagVO>('/api/v1/tags', payload)
  },
  update(tagId: string, payload: { name?: string; color?: string; description?: string | null }) {
    return apiPut<boolean>(`/api/v1/tags/${tagId}`, payload)
  },
  delete(tagId: string) {
    return apiDelete<boolean>(`/api/v1/tags/${tagId}`)
  },
  setResourceTags(payload: { resourceType: ResourceType; resourceId: string; tagIds: string[] }) {
    return apiPut<boolean>('/api/v1/resource-tags', payload)
  },
  batchSetResourceTags(payload: { resourceType: ResourceType; resourceIds: string[]; tagIds: string[]; mode: 'APPEND' | 'REPLACE' }) {
    return apiPut<boolean>('/api/v1/resource-tags/batch', payload)
  },
}
