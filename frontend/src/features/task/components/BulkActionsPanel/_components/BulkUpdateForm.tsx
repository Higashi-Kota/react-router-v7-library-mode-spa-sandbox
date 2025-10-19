import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useTransition } from 'react'
import { useFetcher } from 'react-router'
import type { bulkAction } from '../../../../../routes/tasks/bulk/route'
import type { TaskStatus } from '../../../domains/task'

interface BulkUpdateFormProps {
  selectedIds: string[]
  status: TaskStatus
  label: string
  redirectTo: string
  onCompleted?: () => void
}

export function BulkUpdateForm({
  selectedIds,
  status,
  label,
  redirectTo,
  onCompleted,
}: BulkUpdateFormProps) {
  const fetcher = useFetcher<typeof bulkAction>()
  const [isPending, startFormTransition] = useTransition()

  const payload = useMemo(
    () =>
      JSON.stringify({
        update: selectedIds.map((id) => ({ id, data: { status } })),
      }),
    [selectedIds, status],
  )

  const disabled =
    selectedIds.length === 0 || fetcher.state !== 'idle' || isPending

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      startFormTransition(() => {
        fetcher.submit(form)
      })
    },
    [fetcher],
  )

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      onCompleted?.()
    }
  }, [fetcher.state, fetcher.data, onCompleted])

  return (
    <fetcher.Form method="post" action="/tasks/bulk" onSubmit={handleSubmit}>
      <input type="hidden" name="payload" value={payload} readOnly />
      <input type="hidden" name="redirectTo" value={redirectTo} readOnly />
      <button className="button-secondary" type="submit" disabled={disabled}>
        {fetcher.state !== 'idle' ? '送信中…' : label}
      </button>
    </fetcher.Form>
  )
}
