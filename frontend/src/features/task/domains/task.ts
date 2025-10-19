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

export interface TaskFormInput {
  title: string
  description: string
  status: TaskStatus
  dueDate: string | null
}
