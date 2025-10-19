import { useCallback } from 'react'
import {
  useFetcher,
  useLoaderData,
  useLocation,
  useNavigation,
  useRevalidator,
} from 'react-router'
import {
  BulkActionsPanel,
  DashboardHeader,
  StatsHeader,
  TaskFilters,
  TaskTable,
} from '../../features/task/components'
import { useBulkSelection, useDashboardFilters, useTaskStats } from './_hooks'
import { dashboardLoader } from './_io/read'
import { dashboardAction } from './_io/write'
import { buildDashboardFetcherHref } from './_utils/buildDashboardFetcherHref'

export { dashboardAction, dashboardLoader }

export function DashboardRoute() {
  const loaderData = useLoaderData<typeof dashboardLoader>()
  const filterFetcher = useFetcher<typeof dashboardLoader>()
  const navigation = useNavigation()
  const revalidator = useRevalidator()
  const location = useLocation()

  // Custom hooks
  const { selectedIds, selectedIdsArray, toggleSelection, clearSelection } =
    useBulkSelection()

  const filtersState = useDashboardFilters({ fetcher: filterFetcher })

  // fetcherのデータがあればそれを優先、なければloaderDataを使用
  const tasks = filterFetcher.data?.tasks ?? loaderData.tasks ?? []
  const stats = useTaskStats(tasks)

  const currentPath = `${location.pathname}${location.search}`
  const redirectTo = currentPath || '/'

  const handleRevalidate = useCallback(async () => {
    const currentParams = new URLSearchParams(window.location.search)
    const query = currentParams.toString()

    filterFetcher.load(buildDashboardFetcherHref(query))
    await revalidator.revalidate()
  }, [filterFetcher, revalidator])

  const handleBulkCompleted = useCallback(() => {
    clearSelection()
    revalidator.revalidate()
  }, [clearSelection, revalidator])

  return (
    <section className="card">
      <DashboardHeader redirectTo={redirectTo} />

      <div className="card">
        <TaskFilters
          filtersState={filtersState}
          disabled={navigation.state !== 'idle'}
        />
      </div>

      <div className="card">
        <StatsHeader stats={stats} onRevalidate={handleRevalidate} />

        <TaskTable
          tasks={tasks}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelection}
          redirectTo={redirectTo}
        />
      </div>

      <BulkActionsPanel
        selectedIds={selectedIdsArray}
        redirectTo={redirectTo}
        onCompleted={handleBulkCompleted}
      />
    </section>
  )
}

export function DashboardErrorBoundary() {
  return (
    <div className="card" role="alert">
      <h2 className="section-title">ダッシュボードの読み込みに失敗しました</h2>
      <p className="subtle">
        ページを再読み込みするか、バックエンドの状態を確認してください。
      </p>
    </div>
  )
}
