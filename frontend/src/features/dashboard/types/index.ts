import type React from 'react'
import type { Task, TaskStatus } from '../../task/domains/task'

export interface DashboardFiltersState {
  statusValue: string
  searchValue: string
  updateFiltersShallow: (nextStatus: string, nextSearch: string) => void
  handleStatusChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleSearchBlur: (event: React.FocusEvent<HTMLInputElement>) => void
}

export interface TaskStats {
  total: number
  byStatus: {
    pending: number
    in_progress: number
    completed: number
  }
}

export interface FilterParams {
  status?: TaskStatus
  search?: string
}

export interface DashboardLoaderData {
  tasks: Task[]
  filters: FilterParams
}

export interface BulkSelectionState {
  selectedIds: Set<string>
  selectedIdsArray: string[]
  toggleSelection: (taskId: string) => void
  clearSelection: () => void
}
