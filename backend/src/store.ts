import { customAlphabet } from 'nanoid'
import type {
  BulkMutationResult,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
} from './types.js'

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 12)

const tasks = new Map<string, Task>()

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeDueDate(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('dueDate must be a valid ISO 8601 string')
  }
  return date.toISOString()
}

export function listTasks(): Task[] {
  return Array.from(tasks.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id)
}

export function createTask(input: TaskCreateInput): Task {
  const now = nowIso()
  const task: Task = {
    id: nanoid(),
    title: input.title,
    description: input.description ?? '',
    status: input.status ?? 'pending',
    dueDate: normalizeDueDate(input.dueDate) ?? null,
    createdAt: now,
    updatedAt: now,
  }
  tasks.set(task.id, task)
  return task
}

export function updateTask(
  id: string,
  input: TaskUpdateInput,
): Task | undefined {
  const current = tasks.get(id)
  if (!current) {
    return undefined
  }
  const updated: Task = {
    ...current,
    ...input,
    dueDate:
      input.dueDate !== undefined
        ? (normalizeDueDate(input.dueDate) ?? null)
        : current.dueDate,
    updatedAt: nowIso(),
  }
  if (input.title !== undefined) {
    updated.title = input.title
  }
  if (input.description !== undefined) {
    updated.description = input.description ?? ''
  }
  if (input.status !== undefined) {
    updated.status = input.status
  }
  tasks.set(id, updated)
  return updated
}

export function deleteTask(id: string): boolean {
  return tasks.delete(id)
}

export function bulkMutate(options: {
  create?: TaskCreateInput[]
  update?: Array<{ id: string; data: TaskUpdateInput }>
  delete?: string[]
}): BulkMutationResult {
  const result: BulkMutationResult = {
    created: [],
    updated: [],
    deleted: [],
    errors: [],
  }

  options.create?.forEach((entry, index) => {
    try {
      const created = createTask(entry)
      result.created.push(created)
    } catch (error) {
      result.errors.push({
        operation: `create[${index}]`,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  })

  options.update?.forEach(({ id, data }, index) => {
    try {
      const updated = updateTask(id, data)
      if (!updated) {
        result.errors.push({
          operation: `update[${index}]`,
          id,
          message: 'Task not found',
        })
        return
      }
      result.updated.push(updated)
    } catch (error) {
      result.errors.push({
        operation: `update[${index}]`,
        id,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  })

  options.delete?.forEach((id, index) => {
    if (!tasks.has(id)) {
      result.errors.push({
        operation: `delete[${index}]`,
        id,
        message: 'Task not found',
      })
      return
    }
    tasks.delete(id)
    result.deleted.push(id)
  })

  return result
}

function seed(): void {
  if (tasks.size > 0) {
    return
  }
  ;[
    {
      title: '要件ヒアリング',
      description: 'クライアントとの初回ミーティング',
      status: 'completed' as const,
      dueDate: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      title: 'UIプロトタイプ作成',
      description: 'Figmaで主要画面を作成',
      status: 'in_progress' as const,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    },
    {
      title: 'APIスキーマ設計',
      description: 'OpenAPI仕様のドラフト作成',
      status: 'pending' as const,
      dueDate: null,
    },
  ].forEach((task) => {
    createTask(task)
  })
}

seed()
