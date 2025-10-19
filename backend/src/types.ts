export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskCreateInput {
  title: string
  description?: string
  status?: TaskStatus
  dueDate?: string | null
}

export interface TaskUpdateInput {
  title?: string
  description?: string
  status?: TaskStatus
  dueDate?: string | null
}

export interface BulkMutationResult {
  created: Task[]
  updated: Task[]
  deleted: string[]
  errors: Array<{ operation: string; id?: string; message: string }>
}
