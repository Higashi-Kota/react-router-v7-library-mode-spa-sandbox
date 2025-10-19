import type { Task } from '../../domains/task'
import { TaskRow } from './_components/TaskRow'

interface TaskTableProps {
  tasks: Task[]
  selectedIds: Set<string>
  onToggleSelect: (taskId: string) => void
  redirectTo: string
}

export function TaskTable({
  tasks,
  selectedIds,
  onToggleSelect,
  redirectTo,
}: TaskTableProps) {
  if (tasks.length === 0) {
    return <p className="subtle">該当するタスクはありません。</p>
  }

  return (
    <div className="bulk-panel">
      <table className="task-table">
        <thead>
          <tr>
            <th scope="col">選択</th>
            <th scope="col">タイトル</th>
            <th scope="col">状態</th>
            <th scope="col">期限</th>
            <th scope="col">更新日</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              checked={selectedIds.has(task.id)}
              onToggle={() => onToggleSelect(task.id)}
              redirectTo={redirectTo}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
