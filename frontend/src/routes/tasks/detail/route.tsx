import { useMemo } from 'react'
import {
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useSearchParams,
} from 'react-router'
import type { Attachment } from '../../../features/attachment/domains/attachment'
import type { CommentNode } from '../../../features/comment/domains/comment'
import { DeleteForm } from '../../../features/task/components/DeleteForm'
import type { Task } from '../../../features/task/domains/task'
import { formatDateTime } from '../../../lib/date'
import { taskDetailLoader } from './_io/read'
import { taskDetailAction } from './_io/write'
import type { TaskDetailLoaderData } from './_types'

export { taskDetailAction, taskDetailLoader }
export type { TaskDetailOutletContext } from './_types'

export function TaskDetailRoute() {
  const { task, attachments, comments } = useLoaderData<TaskDetailLoaderData>()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const redirectQuery = searchParams.get('redirect')
  const redirectTo = redirectQuery?.startsWith('/') ? redirectQuery : '/tasks'

  const normalizedPath = location.pathname.replace(/\/+$/, '')
  const isAttachmentsView = normalizedPath.endsWith('/attachments')
  const isCommentsView = normalizedPath.endsWith('/comments')
  const detailBasePath = normalizedPath.replace(/\/(attachments|comments)$/, '')
  const detailHref = `${detailBasePath}${location.search}`

  return (
    <div className="task-detail-layout">
      <aside className="task-detail-sidebar task-detail-sidebar-left">
        <CommentsSidebar
          taskId={task.id}
          comments={comments}
          redirectTo={redirectTo}
          active={isCommentsView}
        />
      </aside>

      <section className="task-detail-main">
        {isAttachmentsView || isCommentsView ? (
          <Outlet
            context={{
              task,
              redirectTo,
              detailHref,
            }}
          />
        ) : (
          <TaskOverviewPanel
            task={task}
            redirectTo={redirectTo}
            detailHref={detailHref}
          />
        )}
      </section>

      <aside className="task-detail-sidebar task-detail-sidebar-right">
        {isAttachmentsView || isCommentsView ? (
          <TaskSummaryPanel task={task} detailHref={detailHref} />
        ) : (
          <AttachmentsSidebar
            taskId={task.id}
            attachments={attachments}
            redirectTo={redirectTo}
          />
        )}
      </aside>
    </div>
  )
}

export function TaskDetailErrorBoundary() {
  return (
    <div className="card" role="alert">
      <h2 className="section-title">タスクの取得に失敗しました</h2>
      <p className="subtle">URL と バックエンドを確認してください。</p>
    </div>
  )
}

function TaskOverviewPanel({
  task,
  redirectTo,
  detailHref,
}: {
  task: Task
  redirectTo: string
  detailHref: string
}) {
  return (
    <section className="card task-detail-main-card">
      <header className="app-header" style={{ padding: 0 }}>
        <div>
          <h2 className="section-title">{task.title}</h2>
          <p className="subtle">作成日: {formatDateTime(task.createdAt)}</p>
        </div>
        <DeleteForm redirectTo={redirectTo} intent="delete" />
      </header>

      <div className="card">
        <h3 className="section-title">概要</h3>
        <p className="subtle">{task.description || '詳細情報は未登録です'}</p>
      </div>

      <div className="card" style={{ display: 'grid', gap: '12px' }}>
        <div>
          <span className="subtle">ステータス</span>
          <p className="status-badge" data-status={task.status}>
            {task.status === 'pending' && '未着手'}
            {task.status === 'in_progress' && '進行中'}
            {task.status === 'completed' && '完了'}
          </p>
        </div>
        <div>
          <span className="subtle">期限</span>
          <p>{task.dueDate ? formatDateTime(task.dueDate) : '未設定'}</p>
        </div>
        <div>
          <span className="subtle">更新日時</span>
          <p>{formatDateTime(task.updatedAt)}</p>
        </div>
      </div>

      <div className="form-actions">
        <Link className="button-secondary" to={redirectTo}>
          一覧へ戻る
        </Link>
        <Link
          className="button-secondary"
          to={`/tasks/${task.id}/attachments?redirect=${encodeURIComponent(redirectTo)}`}
        >
          添付ファイル
        </Link>
        <Link
          className="button-secondary"
          to={`/tasks/${task.id}/comments?redirect=${encodeURIComponent(redirectTo)}`}
        >
          コメント
        </Link>
        <Link
          className="button-primary"
          to={`/tasks/${task.id}/edit?redirect=${encodeURIComponent(detailHref)}`}
        >
          編集ページへ
        </Link>
      </div>
    </section>
  )
}

function TaskSummaryPanel({
  task,
  detailHref,
}: {
  task: Task
  detailHref: string
}) {
  return (
    <section className="card task-sidebar-card">
      <h3 className="section-title">タスク情報</h3>
      <p className="subtle">添付・コメント操作後も内容を参照できます。</p>
      <div className="task-summary-grid">
        <div>
          <span className="subtle">タイトル</span>
          <p>{task.title}</p>
        </div>
        <div>
          <span className="subtle">ステータス</span>
          <p className="status-badge" data-status={task.status}>
            {task.status === 'pending' && '未着手'}
            {task.status === 'in_progress' && '進行中'}
            {task.status === 'completed' && '完了'}
          </p>
        </div>
        <div>
          <span className="subtle">期限</span>
          <p>{task.dueDate ? formatDateTime(task.dueDate) : '未設定'}</p>
        </div>
        <div>
          <span className="subtle">更新日時</span>
          <p>{formatDateTime(task.updatedAt)}</p>
        </div>
      </div>
      <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
        <Link className="button-secondary" to={detailHref}>
          タスク詳細へ戻る
        </Link>
      </div>
    </section>
  )
}

function AttachmentsSidebar({
  taskId,
  attachments,
  redirectTo,
}: {
  taskId: string
  attachments: Attachment[]
  redirectTo: string
}) {
  return (
    <section className="card task-sidebar-card">
      <h3 className="section-title">添付ファイル</h3>
      <p className="subtle">
        管理や追加は「添付ファイル」タブから操作できます。
      </p>
      {attachments.length === 0 ? (
        <p className="subtle">添付ファイルはまだありません。</p>
      ) : (
        <ul className="attachment-preview-list">
          {attachments.slice(0, 5).map((attachment) => (
            <li key={attachment.id}>
              <strong>{attachment.filename}</strong>
              <span className="subtle">
                {attachment.mimetype} / {formatDateTime(attachment.uploadedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
        <Link
          className="button-secondary"
          to={`/tasks/${taskId}/attachments?redirect=${encodeURIComponent(redirectTo)}`}
        >
          管理する
        </Link>
      </div>
    </section>
  )
}

function CommentsSidebar({
  taskId,
  comments,
  redirectTo,
  active,
}: {
  taskId: string
  comments: CommentNode[]
  redirectTo: string
  active: boolean
}) {
  const flattened = useMemo(() => flattenComments(comments), [comments])

  return (
    <section className="card task-sidebar-card">
      <header className="app-header" style={{ padding: 0 }}>
        <div>
          <h3 className="section-title">コメント &amp; スレッド</h3>
          <p className="subtle">
            {flattened.length} 件のメッセージが紐づいています。
          </p>
        </div>
        {!active && (
          <Link
            className="button-secondary"
            to={`/tasks/${taskId}/comments?redirect=${encodeURIComponent(redirectTo)}`}
          >
            一覧を見る
          </Link>
        )}
      </header>
      {flattened.length === 0 ? (
        <p className="subtle">まだコメントはありません。</p>
      ) : (
        <ul className="comment-preview-list">
          {flattened.slice(0, 5).map((comment) => (
            <li key={comment.id}>
              <strong>{comment.author?.trim() || '匿名ユーザー'}</strong>
              <p className="subtle">{comment.body}</p>
              <time className="subtle" dateTime={comment.createdAt}>
                {formatDateTime(comment.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function flattenComments(nodes: CommentNode[]): Array<CommentNode> {
  const result: CommentNode[] = []
  const walk = (list: CommentNode[]) => {
    for (const node of list) {
      result.push(node)
      if (node.children.length > 0) {
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return result
}
