import type { TaskFormInput } from '../../../../features/task/domains/task'

export interface TaskCreateLoaderData {
  redirectTo: string
}

export interface TaskCreateActionData {
  errorMessage?: string
  values?: Partial<TaskFormInput>
}
