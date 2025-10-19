import type { Attachment } from '../../../features/attachment/domains/attachment'

export interface TaskAttachmentsLoaderData {
  taskId: string
  attachments: Attachment[]
}

export interface TaskAttachmentsActionError {
  error?: string
}

export interface ChunkUploadOptions {
  enabled: boolean
  sizeBytes: number
  maxRetries: number
  retryDelayMs: number
}
