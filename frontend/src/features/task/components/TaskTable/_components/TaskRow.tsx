import { startTransition } from 'react'
import { Link, useFetcher } from 'react-router'
import { formatDateTime, formatRelative } from '../../../../../lib/date'
import type { dashboardAction } from '../../../../../routes/dashboard/route'
import type { Task, TaskStatus } from '../../../domains/task'
import { DeleteForm } from '../../DeleteForm'

interface TaskRowProps {
  task: Task
  checked: boolean
  onToggle: () => void
  redirectTo: string
}

export function TaskRow({ task, checked, onToggle, redirectTo }: TaskRowProps) {
  const updateFetcher = useFetcher<typeof dashboardAction>({
    key: `task-${task.id}`,
  })

  const updating = updateFetcher.state !== 'idle'

  // Optimistic UI: fetcherのformDataから送信中のステータスを取得
  const optimisticStatus =
    (updateFetcher.formData?.get('status') as TaskStatus | null) ?? task.status

  return (
    <tr className="task-row">
      <td>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`${task.title} を選択`}
        />
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link
            to={`/tasks/${task.id}?redirect=${encodeURIComponent(redirectTo)}`}
          >
            {task.title}
          </Link>
          <span className="subtle">{task.description || '詳細なし'}</span>
        </div>
      </td>
      <td>
        <span className="status-badge" data-status={optimisticStatus}>
          {optimisticStatus === 'pending' && '未着手'}
          {optimisticStatus === 'in_progress' && '進行中'}
          {optimisticStatus === 'completed' && '完了'}
        </span>
        <div style={{ marginTop: '8px' }}>
          <updateFetcher.Form method="post" action="/?index">
            <input type="hidden" name="_intent" value="update-status" />
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <select
              name="status"
              defaultValue={task.status}
              key={task.status}
              onChange={(event) => {
                const form = event.currentTarget.form
                if (!form) {
                  return
                }
                startTransition(() => {
                  updateFetcher.submit(form)
                })
              }}
              disabled={updating}
            >
              <option value="pending">未着手</option>
              <option value="in_progress">進行中</option>
              <option value="completed">完了</option>
            </select>
          </updateFetcher.Form>
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{formatDateTime(task.dueDate)}</span>
          <span className="subtle">{formatRelative(task.dueDate)}</span>
        </div>
      </td>
      <td>{formatDateTime(task.updatedAt)}</td>
      <td>
        <div className="bulk-actions">
          <Link
            className="button-secondary"
            to={`/tasks/${task.id}/edit?redirect=${encodeURIComponent(redirectTo)}`}
          >
            編集
          </Link>
          <Link className="button-primary" to={`/tasks/${task.id}`}>
            詳細
          </Link>
          <DeleteForm
            redirectTo={redirectTo}
            taskId={task.id}
            intent="delete-task"
          />
        </div>
      </td>
    </tr>
  )
}
