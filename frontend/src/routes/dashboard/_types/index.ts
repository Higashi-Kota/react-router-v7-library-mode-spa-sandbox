import type {
  BulkSelectionState,
  DashboardFiltersState,
  FilterParams,
  TaskStats,
} from '../../../features/dashboard/types'
import type { Task } from '../../../features/task/domains/task'

export type {
  BulkSelectionState,
  DashboardFiltersState,
  FilterParams,
  TaskStats,
}

export interface DashboardLoaderData {
  tasks: Task[]
  filters: FilterParams
}
