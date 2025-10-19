import type { LoaderFunctionArgs } from 'react-router'
import { z } from 'zod'
import { fetchComments } from '../../../../api/comments'
import { jsonResponse } from '../../../utils/http'
import type { TaskCommentsLoaderData } from '../../_types'

const paramsSchema = z.object({
  taskId: z.string().min(1),
})

export async function taskCommentsLoader({
  params,
}: LoaderFunctionArgs): Promise<TaskCommentsLoaderData> {
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    throw jsonResponse({ error: 'InvalidTaskId' }, 400)
  }
  const comments = await fetchComments(parsed.data.taskId)
  return { taskId: parsed.data.taskId, comments }
}
