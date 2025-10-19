import type { TaskStatus } from '../../../../features/task/domains/task'

export interface BulkCreateInput {
  title: string
  description?: string
  status?: TaskStatus
  dueDate?: string | null
}

export interface BulkUpdateInput {
  id: string
  data: Partial<{
    title: string
    description: string
    status: TaskStatus
    dueDate: string | null
  }>
}

export interface BulkPayload {
  create?: BulkCreateInput[]
  update?: BulkUpdateInput[]
  delete?: string[]
}
