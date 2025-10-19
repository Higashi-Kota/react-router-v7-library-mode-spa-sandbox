import { useMemo } from 'react'
import type { Task } from '../../task/domains/task'
import type { TaskStats } from '../types'

export function useTaskStats(tasks: Task[]): TaskStats {
  return useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) {
      return {
        total: 0,
        byStatus: {
          pending: 0,
          in_progress: 0,
          completed: 0,
        },
      }
    }

    return tasks.reduce(
      (acc, task) => {
        acc.total += 1
        acc.byStatus[task.status] += 1
        return acc
      },
      {
        total: 0,
        byStatus: {
          pending: 0,
          in_progress: 0,
          completed: 0,
        },
      },
    )
  }, [tasks])
}
