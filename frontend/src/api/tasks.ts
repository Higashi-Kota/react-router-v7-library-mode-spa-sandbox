import { z } from 'zod'
import type { Task, TaskStatus } from '../features/task/domains/task'
import { apiRequest } from '../lib/api-client'

const taskSchema: z.ZodType<Task> = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  dueDate: z.string().datetime({ offset: true }).or(z.null()),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})

const taskListSchema = z.object({ data: z.array(taskSchema) })
const taskItemSchema = z.object({ data: taskSchema })

const bulkSchema = z.object({
  data: z.object({
    created: z.array(taskSchema),
    updated: z.array(taskSchema),
    deleted: z.array(z.string()),
    errors: z.array(
      z.object({
        operation: z.string(),
        id: z.string().optional(),
        message: z.string(),
      }),
    ),
  }),
})

export async function fetchTasks(
  params: { status?: TaskStatus; search?: string } = {},
) {
  const searchParams = new URLSearchParams()
  if (params.status) {
    searchParams.set('status', params.status)
  }
  if (params.search) {
    searchParams.set('search', params.search)
  }

  const query = searchParams.toString()
  const response = await apiRequest(`/api/tasks${query ? `?${query}` : ''}`)
  const parsed = taskListSchema.parse(response)
  return parsed.data
}

export async function fetchTask(taskId: string) {
  const response = await apiRequest(`/api/tasks/${taskId}`)
  const parsed = taskItemSchema.parse(response)
  return parsed.data
}

export async function createTask(input: {
  title: string
  description?: string
  status?: TaskStatus
  dueDate?: string | null
}) {
  const response = await apiRequest(`/api/tasks`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const parsed = taskItemSchema.parse(response)
  return parsed.data
}

export async function updateTask(
  taskId: string,
  input: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>,
) {
  const response = await apiRequest(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  const parsed = taskItemSchema.parse(response)
  return parsed.data
}

export async function deleteTask(taskId: string) {
  await apiRequest(`/api/tasks/${taskId}`, {
    method: 'DELETE',
    parseAs: 'none',
  })
}

export async function bulkMutateTasks(payload: {
  create?: Array<{
    title: string
    description?: string
    status?: TaskStatus
    dueDate?: string | null
  }>
  update?: Array<{
    id: string
    data: Partial<Pick<Task, 'title' | 'description' | 'status' | 'dueDate'>>
  }>
  delete?: string[]
}) {
  const response = await apiRequest(`/api/tasks/bulk`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const parsed = bulkSchema.parse(response)
  return parsed.data
}
