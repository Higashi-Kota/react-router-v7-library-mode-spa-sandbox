import type { Attachment } from '../features/attachment/domains/attachment'
import { apiRequest } from '../lib/api-client'

interface AttachmentResponse {
  data: Attachment[]
}

export async function fetchAttachments(taskId: string) {
  const response = await apiRequest<AttachmentResponse>(
    `/api/tasks/${taskId}/attachments`,
  )
  return response.data
}

export async function deleteAttachment(taskId: string, attachmentId: string) {
  await apiRequest(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    parseAs: 'none',
  })
}
