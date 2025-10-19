import { Form } from 'react-router'

interface CreateCommentFormProps {
  taskId: string
  busy: boolean
}

export function CreateCommentForm({ taskId, busy }: CreateCommentFormProps) {
  return (
    <Form method="post" className="form-grid" replace>
      <input type="hidden" name="_intent" value="create" />
      <div className="form-field">
        <span>表示名 (任意)</span>
        <input name="author" type="text" placeholder="お名前" disabled={busy} />
      </div>
      <div className="form-field">
        <span>コメント</span>
        <textarea name="body" rows={3} required disabled={busy} />
      </div>
      <div className="form-actions">
        <button className="button-primary" type="submit" disabled={busy}>
          投稿する
        </button>
      </div>
      <input type="hidden" name="taskId" value={taskId} />
    </Form>
  )
}
