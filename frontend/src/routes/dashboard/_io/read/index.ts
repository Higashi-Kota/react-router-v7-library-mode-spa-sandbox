import type { LoaderFunctionArgs } from 'react-router'
import { fetchTasks } from '../../../../api/tasks.js'
import type { TaskStatus } from '../../../../features/task/domains/task.js'
import type { DashboardLoaderData } from '../../_types/index.js'

function isTaskStatus(value: string | null): value is TaskStatus {
  return value === 'pending' || value === 'in_progress' || value === 'completed'
}

export async function dashboardLoader({
  request,
}: LoaderFunctionArgs): Promise<DashboardLoaderData> {
  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status')
  const searchParam = url.searchParams.get('search')
  const filters: DashboardLoaderData['filters'] = {}

  if (statusParam && isTaskStatus(statusParam)) {
    filters.status = statusParam
  }
  // searchParamが存在し、かつ空文字列でない場合のみ追加
  if (searchParam && searchParam.trim() !== '') {
    filters.search = searchParam.trim()
  }

  const tasks = await fetchTasks(filters)

  return {
    tasks,
    filters,
  }
}
