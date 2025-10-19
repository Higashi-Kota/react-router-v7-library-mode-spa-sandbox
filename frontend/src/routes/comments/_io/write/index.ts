import { type ActionFunctionArgs, redirect } from 'react-router'
import { z } from 'zod'
import {
  createComment,
  deleteComment,
  updateComment,
} from '../../../../api/comments'
import { jsonResponse } from '../../../utils/http'

const paramsSchema = z.object({
  taskId: z.string().min(1),
})

const createSchema = z.object({
  body: z.string().trim().min(1, 'コメントを入力してください'),
  parentId: z.string().min(1).optional(),
  author: z.string().trim().optional(),
})

const updateSchema = z.object({
  body: z.string().trim().min(1, 'コメントを入力してください'),
})

export async function taskCommentsAction({
  request,
  params,
}: ActionFunctionArgs) {
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return jsonResponse({ error: 'InvalidTaskId' }, 400)
  }
  const taskId = parsed.data.taskId
  const formData = await request.formData()
  const intent = String(formData.get('_intent') ?? '')

  try {
    if (intent === 'create') {
      const input = createSchema.parse({
        body: formData.get('body'),
        parentId: formData.get('parentId') || undefined,
        author: formData.get('author') || undefined,
      })
      await createComment(taskId, input)
      return redirect('../comments')
    }

    if (intent === 'update') {
      const commentId = String(formData.get('commentId') ?? '')
      if (!commentId) {
        return jsonResponse({ error: 'CommentIdRequired' }, 400)
      }
      const input = updateSchema.parse({ body: formData.get('body') })
      await updateComment(taskId, commentId, input.body)
      return redirect('../comments')
    }

    if (intent === 'delete') {
      const commentId = String(formData.get('commentId') ?? '')
      if (!commentId) {
        return jsonResponse({ error: 'CommentIdRequired' }, 400)
      }
      await deleteComment(taskId, commentId)
      return redirect('../comments')
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message ?? '入力値が不正です' }
    }
    return {
      error: error instanceof Error ? error.message : '操作に失敗しました',
    }
  }

  return { error: '未対応のアクションです' }
}
