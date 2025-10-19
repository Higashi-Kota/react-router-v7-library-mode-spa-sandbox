import type { FormEvent, HTMLAttributes } from 'react'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { flushSync } from 'react-dom'
import { Form, Link, useSubmit } from 'react-router'
import { UnsavedChangesDialog } from '../../../../components/UnsavedChangesDialog'
import { useUnsavedChangesBlocker } from '../../../../lib/useUnsavedChangesBlocker'
import type { TaskFormInput } from '../../domains/task'
import { TaskFormFields, type TaskFormValues } from '../TaskFormFields'

interface CreateFormProps
  extends Pick<HTMLAttributes<HTMLFormElement>, 'className'> {
  redirectTo: string
  defaultValues?: Partial<TaskFormInput>
  submitting?: boolean
  errorMessage?: string
  backHref: string
}

export function CreateForm({
  redirectTo,
  defaultValues,
  submitting = false,
  errorMessage,
  className,
  backHref,
}: CreateFormProps) {
  const submit = useSubmit()
  const [isPending, startFormTransition] = useTransition()
  const [touched, setTouched] = useState<{ title: boolean }>({ title: false })
  const [ignoreBlocker, setIgnoreBlocker] = useState(false)

  const initialValues: TaskFormValues = {
    title: defaultValues?.title ?? '',
    description: defaultValues?.description ?? '',
    status: defaultValues?.status ?? 'pending',
    dueDate: defaultValues?.dueDate ? defaultValues.dueDate.slice(0, 10) : '',
  }
  const initialValuesRef = useRef<TaskFormValues>(initialValues)
  const [values, setValues] = useState<TaskFormValues>(initialValues)

  const handleFieldChange = useCallback(
    <K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) => {
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }))
    },
    [],
  )

  const handleFieldBlur = useCallback((field: keyof TaskFormValues) => {
    if (field === 'title') {
      setTouched((prev) => ({ ...prev, title: true }))
    }
  }, [])

  const titleValid = values.title.trim().length > 0
  const titleError =
    !titleValid && touched.title ? 'タイトルは必須です' : undefined
  const busy = submitting || isPending
  const hasChanges =
    values.title !== initialValuesRef.current.title ||
    values.description !== initialValuesRef.current.description ||
    values.status !== initialValuesRef.current.status ||
    values.dueDate !== initialValuesRef.current.dueDate
  const canSubmit = titleValid && !busy
  const shouldBlockNavigation =
    !ignoreBlocker && titleValid && hasChanges && !busy
  const {
    dialogOpen: showUnsavedChangesDialog,
    proceed: confirmNavigation,
    cancel: cancelNavigation,
  } = useUnsavedChangesBlocker(shouldBlockNavigation)

  useEffect(() => {
    if (!busy) {
      setIgnoreBlocker(false)
    }
  }, [busy])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      if (!titleValid) {
        setTouched((prev) => ({ ...prev, title: true }))
        return
      }
      flushSync(() => {
        setIgnoreBlocker(true)
      })
      startFormTransition(() => {
        submit(form, {
          method: 'post',
          replace: true,
          preventScrollReset: true,
        })
      })
    },
    [submit, titleValid],
  )

  return (
    <Form method="post" className={className ?? 'card'} onSubmit={handleSubmit}>
      <input type="hidden" name="_intent" value="create" />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <TaskFormFields
        values={values}
        onChange={handleFieldChange}
        onBlur={handleFieldBlur}
        disabled={busy}
        errors={{ title: titleError }}
      />
      <div className="form-actions">
        <Link className="button-secondary" to={backHref}>
          戻る
        </Link>
        <button className="button-primary" type="submit" disabled={!canSubmit}>
          {busy ? '作成中…' : 'タスクを追加'}
        </button>
      </div>
      {errorMessage && (
        <p className="subtle" role="alert">
          {errorMessage}
        </p>
      )}
      <UnsavedChangesDialog
        open={showUnsavedChangesDialog}
        onConfirm={confirmNavigation}
        onCancel={cancelNavigation}
      />
    </Form>
  )
}
