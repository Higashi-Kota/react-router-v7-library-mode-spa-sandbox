import { useMemo } from 'react'
import { useActionData, useLoaderData, useNavigation } from 'react-router'
import { CreateForm } from '../../../features/task/components/CreateForm'
import type { TaskFormInput } from '../../../features/task/domains/task'
import { taskCreateLoader } from './_io/read'
import { taskCreateAction } from './_io/write'
import type { TaskCreateActionData, TaskCreateLoaderData } from './_types'

export { taskCreateAction, taskCreateLoader }

export function TaskCreateRoute() {
  const { redirectTo } = useLoaderData<TaskCreateLoaderData>()
  const actionData = useActionData<TaskCreateActionData>()
  const navigation = useNavigation()
  const submitting = navigation.state !== 'idle'

  const defaultValues = useMemo<Partial<TaskFormInput>>(
    () => ({
      title: actionData?.values?.title ?? '',
      description: actionData?.values?.description ?? '',
      status: actionData?.values?.status ?? 'pending',
      dueDate: actionData?.values?.dueDate ?? null,
    }),
    [actionData],
  )

  return (
    <section className="card" style={{ maxWidth: '720px' }}>
      <h2 className="section-title">新規タスク作成</h2>
      <CreateForm
        redirectTo={redirectTo}
        defaultValues={defaultValues}
        submitting={submitting}
        errorMessage={actionData?.errorMessage}
        backHref={redirectTo}
      />
    </section>
  )
}

export function TaskCreateErrorBoundary() {
  return (
    <div className="card" role="alert">
      <h2 className="section-title">新規作成画面の読み込みに失敗しました</h2>
      <p className="subtle">
        再読み込みしても解決しない場合はバックエンドログを確認してください。
      </p>
    </div>
  )
}
