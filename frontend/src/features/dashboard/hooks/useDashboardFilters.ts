import type { ChangeEvent, FocusEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import type { FetcherWithComponents } from 'react-router'
import type { DashboardFiltersState, DashboardLoaderData } from '../types'
import { buildDashboardFetcherHref } from '../utils/buildDashboardFetcherHref'

interface UseDashboardFiltersParams {
  fetcher: FetcherWithComponents<DashboardLoaderData>
}

export function useDashboardFilters({
  fetcher,
}: UseDashboardFiltersParams): DashboardFiltersState {
  const currentParams = new URLSearchParams(window.location.search)
  const statusParam = currentParams.get('status') ?? ''
  const searchParam = currentParams.get('search') ?? ''

  const [statusValue, setStatusValue] = useState(statusParam)
  const [searchValue, setSearchValue] = useState(searchParam)

  // ブラウザの戻る/進むボタンでの変更を検知
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      setStatusValue(params.get('status') ?? '')
      setSearchValue(params.get('search') ?? '')
      const query = params.toString()
      fetcher.load(buildDashboardFetcherHref(query))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [fetcher])

  // URLパラメータを更新する関数（window.history経由でReact Routerのナビゲーションを回避）
  const updateFiltersShallow = useCallback(
    (nextStatus: string, nextSearch: string) => {
      const currentParams = new URLSearchParams(window.location.search)

      if (nextStatus) {
        currentParams.set('status', nextStatus)
      } else {
        currentParams.delete('status')
      }

      if (nextSearch) {
        currentParams.set('search', nextSearch)
      } else {
        currentParams.delete('search')
      }

      const newQueryString = currentParams.toString()
      const newURL = newQueryString
        ? `${window.location.pathname}?${newQueryString}`
        : window.location.pathname

      // window.history.replaceStateで直接URL更新（ナビゲーションなし、フォーカス保持）
      window.history.replaceState(null, '', newURL)

      // fetcherで新しいデータを取得
      fetcher.load(buildDashboardFetcherHref(newQueryString))
    },
    [fetcher],
  )

  // 検索入力の変更（ローカル状態のみ更新）
  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.currentTarget.value
      setSearchValue(value)
    },
    [],
  )

  // 検索入力のblur時にURLパラメータを更新して検索実行
  const handleSearchBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      const value = event.currentTarget.value
      updateFiltersShallow(statusValue, value.trim())
    },
    [statusValue, updateFiltersShallow],
  )

  // ステータス変更時は即座に検索実行
  const handleStatusChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.currentTarget.value
      setStatusValue(value)
      updateFiltersShallow(value, searchValue.trim())
    },
    [searchValue, updateFiltersShallow],
  )

  return {
    statusValue,
    searchValue,
    updateFiltersShallow,
    handleStatusChange,
    handleSearchChange,
    handleSearchBlur,
  }
}
