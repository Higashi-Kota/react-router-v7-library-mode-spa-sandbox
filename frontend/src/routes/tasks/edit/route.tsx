import { useMemo } from 'react'
import { useActionData, useLoaderData, useNavigation } from 'react-router'
import { UpdateForm } from '../../../features/task/components/UpdateForm'
import type { TaskFormInput } from '../../../features/task/domains/task'
import { taskEditLoader } from './_io/read'
import { taskEditAction } from './_io/write'
import type { TaskEditActionData, TaskEditLoaderData } from './_types'

export { taskEditAction, taskEditLoader }

export function TaskEditRoute() {
  const { task, redirectTo } = useLoaderData<TaskEditLoaderData>()
  const actionData = useActionData<TaskEditActionData>()
  const navigation = useNavigation()
  const submitting = navigation.state !== 'idle'

  const defaultValues = useMemo<TaskFormInput>(
    () => ({
      title: actionData?.values?.title ?? task.title,
      description: actionData?.values?.description ?? task.description,
      status: actionData?.values?.status ?? task.status,
      dueDate: actionData?.values?.dueDate ?? task.dueDate,
    }),
    [actionData, task],
  )

  return (
    <section className="card" style={{ maxWidth: '720px' }}>
      <h2 className="section-title">タスク編集</h2>
      <UpdateForm
        redirectTo={redirectTo}
        defaultValues={defaultValues}
        submitting={submitting}
        errorMessage={actionData?.errorMessage}
        backHref={redirectTo}
      />
    </section>
  )
}

export function TaskEditErrorBoundary() {
  return (
    <div className="card" role="alert">
      <h2 className="section-title">タスク編集画面の読み込みに失敗しました</h2>
      <p className="subtle">
        対象のタスクが削除されていないか確認してください。
      </p>
    </div>
  )
}
