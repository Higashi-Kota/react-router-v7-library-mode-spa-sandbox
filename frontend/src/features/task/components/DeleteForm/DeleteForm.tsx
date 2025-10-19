import type { FormEvent, HTMLAttributes } from 'react'
import { useCallback, useRef, useState, useTransition } from 'react'
import { Form, useSubmit } from 'react-router'

interface DeleteFormProps
  extends Pick<HTMLAttributes<HTMLFormElement>, 'className'> {
  redirectTo: string
  submitting?: boolean
  intent?: string
  taskId?: string
}

export function DeleteForm({
  redirectTo,
  submitting = false,
  className,
  intent = 'delete',
  taskId,
}: DeleteFormProps) {
  const submit = useSubmit()
  const [isPending, startFormTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const pendingFormRef = useRef<HTMLFormElement | null>(null)

  const handlePrompt = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    pendingFormRef.current = event.currentTarget
    setConfirmOpen(true)
  }, [])

  const handleConfirm = useCallback(() => {
    const form = pendingFormRef.current
    if (!form) {
      return
    }
    setConfirmOpen(false)
    startFormTransition(() => {
      submit(form, {
        method: 'post',
        replace: true,
        preventScrollReset: true,
      })
    })
  }, [submit])

  const handleCancel = useCallback(() => {
    setConfirmOpen(false)
  }, [])

  const busy = submitting || isPending

  return (
    <>
      <Form method="post" className={className} onSubmit={handlePrompt}>
        <input type="hidden" name="_intent" value={intent} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {taskId ? <input type="hidden" name="taskId" value={taskId} /> : null}
        <button
          className="button-secondary"
          type="submit"
          disabled={busy || confirmOpen}
        >
          {busy ? '削除中…' : '削除'}
        </button>
      </Form>

      {confirmOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            aria-describedby="delete-confirm-description"
          >
            <h3 id="delete-confirm-title" className="section-title">
              削除の確認
            </h3>
            <p id="delete-confirm-description" className="subtle">
              この操作は取り消せません。本当に削除しますか？
            </p>
            <div className="modal-actions">
              <button
                className="button-secondary"
                type="button"
                onClick={handleCancel}
              >
                キャンセル
              </button>
              <button
                className="button-primary"
                type="button"
                onClick={handleConfirm}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
