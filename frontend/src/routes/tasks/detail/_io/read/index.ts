import type { LoaderFunctionArgs } from 'react-router'
import { fetchAttachments } from '../../../../../api/attachments'
import { fetchComments } from '../../../../../api/comments'
import { fetchTask } from '../../../../../api/tasks'
import type { TaskDetailLoaderData } from '../../_types'

export async function taskDetailLoader({
  params,
}: LoaderFunctionArgs): Promise<TaskDetailLoaderData> {
  if (!params.taskId) {
    throw new Response('Task ID is required', { status: 400 })
  }
  const task = await fetchTask(params.taskId)
  const [attachments, comments] = await Promise.all([
    fetchAttachments(params.taskId),
    fetchComments(params.taskId),
  ])
  return { task, attachments, comments }
}
