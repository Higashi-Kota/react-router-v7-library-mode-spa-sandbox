import { useCallback, useMemo, useState } from 'react'
import type { BulkSelectionState } from '../types'

export function useBulkSelection(): BulkSelectionState {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = useCallback((taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds])

  return {
    selectedIds,
    selectedIdsArray,
    toggleSelection,
    clearSelection,
  }
}
