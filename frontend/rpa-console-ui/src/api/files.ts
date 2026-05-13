import { handleMockRequest } from '@/mocks/mockServer'
import { request } from '@/utils/request'
import type { ApiResponse, UploadFileVO } from '@/types/api'
import { isMockEnabled } from '@/utils/runtime'

export const filesApi = {
  async upload(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    if (isMockEnabled) {
      return handleMockRequest<UploadFileVO>('POST', '/api/v1/files/upload', undefined, formData)
    }
    const { data } = await request.post<ApiResponse<UploadFileVO>>('/api/v1/files/upload', formData)
    return data.data
  },
}
