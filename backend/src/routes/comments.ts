import { Router } from 'express'
import { z } from 'zod'
import {
  createComment,
  deleteComment,
  listCommentTree,
  updateComment,
} from '../comments-store.js'
import { getTask } from '../store.js'

const router = Router()

const paramsSchema = z.object({
  taskId: z.string().min(1),
})

const createBodySchema = z.object({
  body: z.string().trim().min(1, '本文は必須です'),
  parentId: z.string().min(1).optional(),
  author: z.string().trim().optional(),
})

const updateBodySchema = z.object({
  body: z.string().trim().min(1, '本文は必須です'),
})

router.get('/api/tasks/:taskId/comments', (req, res) => {
  const parsed = paramsSchema.safeParse(req.params)
  if (!parsed.success) {
    res.status(400).json({ error: 'InvalidTaskId' })
    return
  }
  const { taskId } = parsed.data
  if (!getTask(taskId)) {
    res.status(404).json({ error: 'TaskNotFound' })
    return
  }
  res.json({ data: listCommentTree(taskId) })
})

router.post('/api/tasks/:taskId/comments', (req, res) => {
  const params = paramsSchema.safeParse(req.params)
  const body = createBodySchema.safeParse(req.body)
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'InvalidPayload' })
    return
  }
  try {
    const comment = createComment({
      taskId: params.data.taskId,
      parentId: body.data.parentId,
      body: body.data.body,
      author: body.data.author,
    })
    res.status(201).json({ data: comment })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CreateFailed'
    const status =
      error instanceof Error && error.message === 'Task not found' ? 404 : 400
    res.status(status).json({ error: message })
  }
})

router.patch('/api/tasks/:taskId/comments/:commentId', (req, res) => {
  const params = z
    .object({ taskId: z.string().min(1), commentId: z.string().min(1) })
    .safeParse(req.params)
  const body = updateBodySchema.safeParse(req.body)
  if (!params.success || !body.success) {
    res.status(400).json({ error: 'InvalidPayload' })
    return
  }
  try {
    const updated = updateComment({
      taskId: params.data.taskId,
      commentId: params.data.commentId,
      body: body.data.body,
    })
    res.json({ data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UpdateFailed'
    const status =
      error instanceof Error && error.message === 'Comment not found'
        ? 404
        : 400
    res.status(status).json({ error: message })
  }
})

router.delete('/api/tasks/:taskId/comments/:commentId', (req, res) => {
  const params = z
    .object({ taskId: z.string().min(1), commentId: z.string().min(1) })
    .safeParse(req.params)
  if (!params.success) {
    res.status(400).json({ error: 'InvalidPayload' })
    return
  }
  const removed = deleteComment(params.data)
  if (!removed) {
    res.status(404).json({ error: 'CommentNotFound' })
    return
  }
  res.status(204).send()
})

export { router as commentsRouter }
