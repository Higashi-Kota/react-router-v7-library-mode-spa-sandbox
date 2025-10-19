import type {
  Task,
  TaskFormInput,
} from '../../../../features/task/domains/task'

export interface TaskEditLoaderData {
  task: Task
  redirectTo: string
}

export interface TaskEditActionData {
  errorMessage?: string
  values?: Partial<TaskFormInput>
}
