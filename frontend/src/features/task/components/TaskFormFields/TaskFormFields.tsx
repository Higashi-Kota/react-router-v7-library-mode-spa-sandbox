import type { TaskStatus } from '../../domains/task'

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'pending', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '完了' },
]

export interface TaskFormValues {
  title: string
  description: string
  status: TaskStatus
  dueDate: string
}

interface TaskFormFieldsProps {
  values: TaskFormValues
  onChange: <K extends keyof TaskFormValues>(
    field: K,
    value: TaskFormValues[K],
  ) => void
  onBlur?: (field: keyof TaskFormValues) => void
  disabled?: boolean
  errors?: Partial<Record<keyof TaskFormValues, string | undefined>>
}

export function TaskFormFields({
  values,
  onChange,
  onBlur,
  disabled,
  errors,
}: TaskFormFieldsProps) {
  const titleError = errors?.title
  const dueDateError = errors?.dueDate

  return (
    <div className="form-grid" aria-disabled={disabled}>
      <label className="form-field">
        <span>タイトル</span>
        <input
          name="title"
          type="text"
          value={values.title}
          placeholder="例：UIレビュー会議"
          disabled={disabled}
          aria-invalid={Boolean(titleError)}
          onChange={(event) => onChange('title', event.currentTarget.value)}
          onBlur={() => onBlur?.('title')}
        />
        {titleError ? <span className="input-error">{titleError}</span> : null}
      </label>

      <label className="form-field">
        <span>詳細</span>
        <textarea
          name="description"
          rows={4}
          value={values.description}
          placeholder="補足情報を記入"
          disabled={disabled}
          onChange={(event) =>
            onChange('description', event.currentTarget.value)
          }
          onBlur={() => onBlur?.('description')}
        />
      </label>

      <label className="form-field">
        <span>ステータス</span>
        <select
          name="status"
          value={values.status}
          disabled={disabled}
          onChange={(event) =>
            onChange('status', event.currentTarget.value as TaskStatus)
          }
          onBlur={() => onBlur?.('status')}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span>期限</span>
        <input
          name="dueDate"
          type="date"
          value={values.dueDate}
          disabled={disabled}
          aria-invalid={Boolean(dueDateError)}
          onChange={(event) => onChange('dueDate', event.currentTarget.value)}
          onBlur={() => onBlur?.('dueDate')}
        />
        {dueDateError ? (
          <span className="input-error">{dueDateError}</span>
        ) : null}
      </label>
    </div>
  )
}
