import { Router } from 'express'
import { z } from 'zod'
import {
  bulkMutate,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from '../store.js'
import type { Task, TaskStatus } from '../types.js'

const router = Router()

const statusSchema = z.enum(['pending', 'in_progress', 'completed'])
const nullableDateTime = z
  .union([
    z.string().datetime({ offset: true }),
    z.string().datetime(),
    z.null(),
  ])
  .optional()

const createBodySchema = z.object({
  title: z.string().trim().min(1, 'title is required'),
  description: z.string().trim().optional(),
  status: statusSchema.optional(),
  dueDate: nullableDateTime,
})

const updateBodySchema = createBodySchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided',
  })

const bulkBodySchema = z.object({
  create: z.array(createBodySchema).optional(),
  update: z
    .array(
      z.object({
        id: z.string().min(1),
        data: updateBodySchema,
      }),
    )
    .optional(),
  delete: z.array(z.string().min(1)).optional(),
})

const querySchema = z.object({
  status: statusSchema.optional(),
  search: z.string().trim().optional(),
})

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.get('/api/tasks', (req, res) => {
  const parseResult = querySchema.safeParse(req.query)
  if (!parseResult.success) {
    res.status(400).json({
      error: 'ValidationError',
      issues: parseResult.error.issues,
    })
    return
  }

  const { status, search } = parseResult.data
  const allTasks = listTasks()
  const filtered = allTasks.filter((task: Task) => {
    if (status && task.status !== status) {
      return false
    }
    if (search) {
      const keyword = search.toLowerCase()
      return (
        task.title.toLowerCase().includes(keyword) ||
        task.description.toLowerCase().includes(keyword)
      )
    }
    return true
  })
  res.json({ data: filtered })
})

router.get('/api/tasks/:id', (req, res) => {
  const task = getTask(req.params.id)
  if (!task) {
    res.status(404).json({ error: 'TaskNotFound' })
    return
  }
  res.json({ data: task })
})

router.post('/api/tasks', (req, res) => {
  const parseResult = createBodySchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({
      error: 'ValidationError',
      issues: parseResult.error.issues,
    })
    return
  }
  const body = parseResult.data
  const created = createTask({
    ...body,
    status: body.status as TaskStatus | undefined,
  })
  res.status(201).json({ data: created })
})

router.put('/api/tasks/:id', (req, res) => {
  const parseResult = createBodySchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({
      error: 'ValidationError',
      issues: parseResult.error.issues,
    })
    return
  }
  const updated = updateTask(req.params.id, parseResult.data)
  if (!updated) {
    res.status(404).json({ error: 'TaskNotFound' })
    return
  }
  res.json({ data: updated })
})

router.patch('/api/tasks/:id', (req, res) => {
  const parseResult = updateBodySchema.safeParse(req.body)
  if (!parseResult.success) {
    res.status(400).json({
      error: 'ValidationError',
      issues: parseResult.error.issues,
    })
    return
  }
  const updated = updateTask(req.params.id, parseResult.data)
  if (!updated) {
    res.status(404).json({ error: 'TaskNotFound' })
    return
  }
  res.json({ data: updated })
})

router.delete('/api/tasks/:id', (req, res) => {
  const removed = deleteTask(req.params.id)
  if (!removed) {
    res.status(404).json({ error: 'TaskNotFound' })
    return
  }
  res.status(204).send()
})

router.post('/api/tasks/bulk', (req, res) => {
  const parseResult = bulkBodySchema.safeParse(req.body ?? {})
  if (!parseResult.success) {
    res.status(400).json({
      error: 'ValidationError',
      issues: parseResult.error.issues,
    })
    return
  }

  const summary = bulkMutate(parseResult.data)
  res.json({ data: summary })
})

export { router as tasksRouter }
