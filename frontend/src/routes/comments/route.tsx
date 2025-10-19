import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Link,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
  useOutletContext,
  useRevalidator,
} from 'react-router'
import { CreateCommentForm } from '../../features/comment/components/CreateCommentForm'
import type { CommentNode } from '../../features/comment/domains/comment'
import { formatDateTime } from '../../lib/date'
import type { TaskDetailOutletContext } from '../tasks/detail/route'
import { taskCommentsLoader } from './_io/read'
import { taskCommentsAction } from './_io/write'
import type { TaskCommentsActionData, TaskCommentsLoaderData } from './_types'

export { taskCommentsAction, taskCommentsLoader }

export function TaskCommentsRoute() {
  const { taskId, comments } = useLoaderData<TaskCommentsLoaderData>()
  const actionData = useActionData<TaskCommentsActionData>()
  const navigation = useNavigation()
  const revalidator = useRevalidator()
  const { task, detailHref } = useOutletContext<TaskDetailOutletContext>()
  const busy = navigation.state !== 'idle'

  const roots = useMemo(() => comments, [comments])
  const totalCount = useMemo(() => countComments(comments), [comments])
  const handleRefresh = useCallback(() => {
    revalidator.revalidate()
  }, [revalidator])

  return (
    <section className="card">
      <header className="app-header" style={{ padding: 0 }}>
        <div>
          <h2 className="section-title">コメント</h2>
          <p className="subtle">
            {task.title} / {totalCount} 件のコメントが紐づいています。
          </p>
        </div>
        <Link className="button-secondary" to={detailHref}>
          タスク詳細へ戻る
        </Link>
      </header>
      <p className="subtle">スレッド形式でコメントを追加できます。</p>

      <CreateCommentForm taskId={taskId} busy={busy} />

      {actionData?.error && (
        <p className="subtle" role="alert">
          {actionData.error}
        </p>
      )}

      <CommentTree
        taskId={taskId}
        comments={roots}
        depth={0}
        onMutate={handleRefresh}
      />
    </section>
  )
}

export function TaskCommentsErrorBoundary() {
  return (
    <div className="card" role="alert">
      <h2 className="section-title">コメントの読み込みに失敗しました</h2>
      <p className="subtle">時間をおいて再度お試しください。</p>
    </div>
  )
}

interface CommentTreeProps {
  taskId: string
  comments: CommentNode[]
  depth: number
  onMutate: () => void
}

function CommentTree({ taskId, comments, depth, onMutate }: CommentTreeProps) {
  if (comments.length === 0) {
    return <p className="subtle">コメントはまだありません。</p>
  }

  return (
    <ul className="comment-tree">
      {comments.map((comment) => (
        <li key={comment.id} className="comment-node">
          <CommentItem
            taskId={taskId}
            comment={comment}
            depth={depth}
            onMutate={onMutate}
          />
        </li>
      ))}
    </ul>
  )
}

function CommentItem({
  taskId,
  comment,
  depth,
  onMutate,
}: {
  taskId: string
  comment: CommentNode
  depth: number
  onMutate: () => void
}) {
  const [showReply, setShowReply] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const fetcher = useFetcher<typeof taskCommentsAction>()
  const busy = fetcher.state !== 'idle'

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.formData) {
      onMutate()
    }
  }, [fetcher.formData, fetcher.state, onMutate])

  const indentDepth = Math.min(depth, 3)

  const toggleReply = () => {
    setShowReply((prev) => !prev)
    setShowEdit(false)
  }

  const toggleEdit = () => {
    setShowEdit((prev) => !prev)
    setShowReply(false)
  }

  return (
    <div className="comment-item" style={{ marginLeft: indentDepth * 16 }}>
      <div className="comment-meta">
        <strong>{comment.author}</strong>
        <span className="subtle">{formatDateTime(comment.createdAt)}</span>
      </div>
      <p>{comment.body}</p>
      <div className="comment-actions">
        <button
          className="button-secondary"
          type="button"
          onClick={toggleReply}
        >
          返信
        </button>
        <button className="button-secondary" type="button" onClick={toggleEdit}>
          編集
        </button>
        <fetcher.Form method="post">
          <input type="hidden" name="_intent" value="delete" />
          <input type="hidden" name="commentId" value={comment.id} />
          <button className="button-secondary" type="submit" disabled={busy}>
            削除
          </button>
        </fetcher.Form>
      </div>
      {showEdit && (
        <fetcher.Form method="post" className="form-grid">
          <input type="hidden" name="_intent" value="update" />
          <input type="hidden" name="commentId" value={comment.id} />
          <textarea name="body" defaultValue={comment.body} required rows={3} />
          <div className="form-actions">
            <button className="button-primary" type="submit" disabled={busy}>
              更新
            </button>
          </div>
        </fetcher.Form>
      )}
      {showReply && (
        <fetcher.Form method="post" className="form-grid">
          <input type="hidden" name="_intent" value="create" />
          <input type="hidden" name="parentId" value={comment.id} />
          <input name="author" type="text" placeholder="表示名 (任意)" />
          <textarea name="body" rows={3} required placeholder="返信を入力" />
          <div className="form-actions">
            <button className="button-primary" type="submit" disabled={busy}>
              送信
            </button>
          </div>
        </fetcher.Form>
      )}
      {comment.children.length > 0 && (
        <CommentTree
          taskId={taskId}
          comments={comment.children}
          depth={depth + 1}
          onMutate={onMutate}
        />
      )}
    </div>
  )
}

function countComments(nodes: CommentNode[]): number {
  return nodes.reduce(
    (acc, node) =>
      acc + 1 + (node.children.length ? countComments(node.children) : 0),
    0,
  )
}
