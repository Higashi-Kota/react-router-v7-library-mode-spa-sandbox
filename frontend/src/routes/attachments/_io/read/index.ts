import type { LoaderFunctionArgs } from 'react-router'
import { z } from 'zod'
import { fetchAttachments } from '../../../../api/attachments'
import { jsonResponse } from '../../../utils/http'
import type { TaskAttachmentsLoaderData } from '../../_types'

const paramsSchema = z.object({
  taskId: z.string().min(1),
})

export async function taskAttachmentsLoader({
  params,
}: LoaderFunctionArgs): Promise<TaskAttachmentsLoaderData> {
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    throw jsonResponse({ error: 'InvalidTaskId' }, 400)
  }
  const attachments = await fetchAttachments(parsed.data.taskId)
  return { attachments, taskId: parsed.data.taskId }
}
