import type { LoaderFunctionArgs } from 'react-router'
import { fetchTask } from '../../../../../api/tasks'
import { normalizeRedirectTarget } from '../../../../utils/redirect'
import type { TaskEditLoaderData } from '../../_types'

export async function taskEditLoader({
  params,
  request,
}: LoaderFunctionArgs): Promise<TaskEditLoaderData> {
  if (!params.taskId) {
    throw new Response('Task ID is required', { status: 400 })
  }
  const task = await fetchTask(params.taskId)
  const url = new URL(request.url)
  const redirectParam = url.searchParams.get('redirect')
  const redirectTo =
    redirectParam !== null
      ? normalizeRedirectTarget(redirectParam, request)
      : normalizeRedirectTarget(request.headers.get('referer'), request)
  return { task, redirectTo }
}
