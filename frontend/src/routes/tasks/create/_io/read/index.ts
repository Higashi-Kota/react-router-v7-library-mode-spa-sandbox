import type { LoaderFunctionArgs } from 'react-router'
import { normalizeRedirectTarget } from '../../../../utils/redirect'
import type { TaskCreateLoaderData } from '../../_types'

export async function taskCreateLoader({
  request,
}: LoaderFunctionArgs): Promise<TaskCreateLoaderData> {
  const url = new URL(request.url)
  const redirectParam = url.searchParams.get('redirect')
  const redirectTo =
    redirectParam !== null
      ? normalizeRedirectTarget(redirectParam, request)
      : normalizeRedirectTarget(request.headers.get('referer'), request)
  return { redirectTo }
}
