import type { FormEvent, HTMLAttributes } from 'react'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { flushSync } from 'react-dom'
import { Form, Link, useSubmit } from 'react-router'
import { UnsavedChangesDialog } from '../../../../components/UnsavedChangesDialog'
import { useUnsavedChangesBlocker } from '../../../../lib/useUnsavedChangesBlocker'
import type { TaskFormInput } from '../../domains/task'
import { TaskFormFields, type TaskFormValues } from '../TaskFormFields'

interface UpdateFormProps
  extends Pick<HTMLAttributes<HTMLFormElement>, 'className'> {
  redirectTo: string
  defaultValues: TaskFormInput
  submitting?: boolean
  errorMessage?: string
  backHref: string
  method?: 'patch' | 'put'
}

export function UpdateForm({
  redirectTo,
  defaultValues,
  submitting = false,
  errorMessage,
  className,
  backHref,
  method = 'patch',
}: UpdateFormProps) {
  const submit = useSubmit()
  const [isPending, startFormTransition] = useTransition()
  const [touched, setTouched] = useState<{ title: boolean }>({ title: false })
  const [ignoreBlocker, setIgnoreBlocker] = useState(false)

  const initialValues: TaskFormValues = {
    title: defaultValues.title,
    description: defaultValues.description ?? '',
    status: defaultValues.status,
    dueDate: defaultValues.dueDate ? defaultValues.dueDate.slice(0, 10) : '',
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
  const canSubmit = titleValid && hasChanges && !busy
  const {
    dialogOpen: showUnsavedChangesDialog,
    proceed: confirmNavigation,
    cancel: cancelNavigation,
  } = useUnsavedChangesBlocker(
    !ignoreBlocker && titleValid && hasChanges && !busy,
  )

  useEffect(() => {
    if (!busy) {
      setIgnoreBlocker(false)
    }
  }, [busy])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      if (!titleValid || !hasChanges) {
        if (!titleValid) {
          setTouched((prev) => ({ ...prev, title: true }))
        }
        return
      }
      flushSync(() => {
        setIgnoreBlocker(true)
      })
      startFormTransition(() => {
        submit(form, {
          method,
          replace: true,
          preventScrollReset: true,
        })
      })
    },
    [hasChanges, method, submit, titleValid],
  )

  return (
    <Form
      method={method}
      className={className ?? 'card'}
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="_intent" value="update" />
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
          {busy ? '更新中…' : '変更を保存'}
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
