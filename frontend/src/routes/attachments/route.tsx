import type { DragEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
  useOutletContext,
  useRevalidator,
} from 'react-router'
import { AttachmentQueueTable } from '../../features/attachment/components/AttachmentQueueTable'
import type { Attachment } from '../../features/attachment/domains/attachment'
import { useAttachmentUploader } from '../../features/attachment/hooks/useAttachmentUploader'
import { formatFileSize } from '../../features/attachment/utils/format'
import { formatDateTime } from '../../lib/date'
import type { TaskDetailOutletContext } from '../tasks/detail/route'
import { taskAttachmentsLoader } from './_io/read'
import { taskAttachmentsAction } from './_io/write'
import type {
  TaskAttachmentsActionError,
  TaskAttachmentsLoaderData,
} from './_types'
import { ATTACHMENT_UPLOAD_CHUNK } from './_utils/constants'

export { taskAttachmentsAction, taskAttachmentsLoader }

export function TaskAttachmentsRoute() {
  const { attachments, taskId } = useLoaderData<TaskAttachmentsLoaderData>()
  const actionError = useActionData<TaskAttachmentsActionError>()
  const navigation = useNavigation()
  const revalidator = useRevalidator()
  const { task, detailHref } = useOutletContext<TaskDetailOutletContext>()

  const handleRefresh = useCallback(() => {
    revalidator.revalidate()
  }, [revalidator])

  const handleUploadSuccess = useCallback(() => {
    handleRefresh()
  }, [handleRefresh])

  const uploader = useAttachmentUploader({
    taskId,
    onSuccess: handleUploadSuccess,
    chunk: ATTACHMENT_UPLOAD_CHUNK,
  })

  const busy = navigation.state !== 'idle'
  const totalSize = useMemo(
    () => attachments.reduce((acc, file) => acc + file.size, 0),
    [attachments],
  )

  return (
    <section className="card">
      <header className="app-header" style={{ padding: 0 }}>
        <div>
          <h2 className="section-title">添付ファイル管理</h2>
          <p className="subtle">
            {task.title} に紐づくファイルをドラッグ＆ドロップで追加できます。
          </p>
        </div>
        <Link className="button-secondary" to={detailHref}>
          タスク詳細へ戻る
        </Link>
      </header>

      <div className="card" id="attachments-upload">
        <h3 className="section-title">ファイルアップロード</h3>
        <p className="subtle">
          複数ファイルを選択すると順に処理され、サイズが大きいファイルは自動的にチャンクアップロードへ切り替わります。
        </p>
        <UploadSection uploader={uploader} busy={busy} />
      </div>

      <div className="card" id="attachment-list">
        <h3 className="section-title">添付ファイル一覧</h3>
        {actionError?.error && (
          <p className="subtle" role="alert">
            {actionError.error}
          </p>
        )}
        <p className="subtle">
          {attachments.length} 件 / 合計 {formatFileSize(totalSize)}
        </p>
        <AttachmentList attachments={attachments} onMutate={handleRefresh} />
      </div>
    </section>
  )
}

export function TaskAttachmentsErrorBoundary() {
  return (
    <div className="card" role="alert">
      <h2 className="section-title">添付ファイルの表示に失敗しました</h2>
      <p className="subtle">時間をおいて再度お試しください。</p>
    </div>
  )
}

function AttachmentList({
  attachments,
  onMutate,
}: {
  attachments: Attachment[]
  onMutate: () => void
}) {
  if (attachments.length === 0) {
    return <p className="subtle">添付ファイルはまだありません。</p>
  }

  return (
    <ul className="attachment-list">
      {attachments.map((attachment) => (
        <AttachmentListItem
          key={attachment.id}
          attachment={attachment}
          onMutate={onMutate}
        />
      ))}
    </ul>
  )
}

function AttachmentListItem({
  attachment,
  onMutate,
}: {
  attachment: Attachment
  onMutate: () => void
}) {
  const fetcher = useFetcher<typeof taskAttachmentsAction>()
  const deleting = fetcher.state !== 'idle'

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.formData) {
      onMutate()
    }
  }, [fetcher.formData, fetcher.state, onMutate])

  return (
    <li className="attachment-item">
      <div className="attachment-meta">
        <strong>{attachment.filename}</strong>
        <span className="subtle">
          {attachment.mimetype} / {formatFileSize(attachment.size)}
        </span>
        <span className="subtle">
          アップロード日時: {formatDateTime(attachment.uploadedAt)}
        </span>
      </div>
      <fetcher.Form method="post">
        <input type="hidden" name="_intent" value="delete-attachment" />
        <input type="hidden" name="attachmentId" value={attachment.id} />
        <button className="button-secondary" type="submit" disabled={deleting}>
          {deleting ? '削除中…' : '削除'}
        </button>
      </fetcher.Form>
    </li>
  )
}

function UploadSection({
  uploader,
  busy,
}: {
  uploader: ReturnType<typeof useAttachmentUploader>
  busy: boolean
}) {
  const {
    state,
    queue,
    queueFiles,
    startUpload,
    startAll,
    abort,
    resume,
    removeItem,
    clearCompleted,
    activeUploadId,
    pausedUploadId,
    isBulkMode,
  } = uploader
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const isUploading = state.kind === 'uploading'
  const canResume = state.kind === 'aborted' && pausedUploadId !== null
  const hasPending = queue.some(
    (item) =>
      item.status === 'ready' ||
      item.status === 'error' ||
      item.status === 'aborted',
  )
  const hasCompleted = queue.some((item) => item.status === 'completed')
  const dropDisabled = busy || isUploading

  const handleFiles = useCallback(
    (files: File[]) => {
      if (!files.length) {
        return
      }
      queueFiles(files)
      setIsDragging(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [queueFiles],
  )

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      event.preventDefault()
      if (dropDisabled) {
        return
      }
      if (!isDragging) {
        setIsDragging(true)
      }
    },
    [dropDisabled, isDragging],
  )

  const handleDragLeave = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      event.preventDefault()
      if (isDragging) {
        setIsDragging(false)
      }
    },
    [isDragging],
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      event.preventDefault()
      if (dropDisabled) {
        setIsDragging(false)
        return
      }
      const files = Array.from(event.dataTransfer.files ?? [])
      setIsDragging(false)
      handleFiles(files)
    },
    [dropDisabled, handleFiles],
  )

  const statusMessage = useMemo(() => {
    switch (state.kind) {
      case 'uploading':
        return `アップロード中… ${
          state.progress !== null ? `${state.progress}%` : '計測中'
        } (${formatFileSize(state.completedBytes)} / ${formatFileSize(state.totalBytes)}${
          isBulkMode ? ', 順次処理' : ''
        })`
      case 'success': {
        const parts: string[] = []
        if (state.attachments.length > 0) {
          parts.push(`${state.attachments.length} 件のファイルを登録しました`)
        }
        if (state.errors.length > 0) {
          parts.push(`警告: ${state.errors.join(', ')}`)
        }
        return parts.join(' / ') || 'アップロードが完了しました'
      }
      case 'aborted':
        return 'アップロードを一時停止しました。再開ボタンで続行できます。'
      case 'error':
        return `アップロードに失敗しました: ${state.message}`
      default:
        return null
    }
  }, [isBulkMode, state])

  return (
    <div className="upload-manager form-grid">
      <input
        ref={fileInputRef}
        type="file"
        name="files"
        multiple
        accept="*/*"
        disabled={dropDisabled}
        style={{ display: 'none' }}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? [])
          handleFiles(files)
        }}
      />

      <button
        type="button"
        className={`upload-dropzone${isDragging ? ' upload-dropzone-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (dropDisabled) {
            return
          }
          fileInputRef.current?.click()
        }}
        disabled={dropDisabled}
      >
        <p>
          ここにファイルをドラッグ＆ドロップするか、クリックしてファイルを選択してください
        </p>
        <span className="subtle">
          {dropDisabled
            ? '現在アップロード処理中のため新規追加はできません'
            : '複数ファイルの選択にも対応しています'}
        </span>
      </button>

      <div
        className="form-actions"
        style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}
      >
        <button
          className="button-primary"
          type="button"
          onClick={startAll}
          disabled={!hasPending || isUploading}
        >
          一括アップロード
        </button>
        <button
          className="button-secondary"
          type="button"
          onClick={abort}
          disabled={!isUploading}
        >
          中断
        </button>
        <button
          className="button-secondary"
          type="button"
          onClick={resume}
          disabled={!canResume}
        >
          再開
        </button>
        <button
          className="button-secondary"
          type="button"
          onClick={clearCompleted}
          disabled={!hasCompleted}
        >
          完了行をクリア
        </button>
      </div>

      {statusMessage ? (
        <p
          className="subtle"
          role={state.kind === 'error' ? 'alert' : undefined}
        >
          {statusMessage}
        </p>
      ) : null}

      <AttachmentQueueTable
        items={queue}
        isUploading={isUploading}
        canResume={canResume}
        onStart={startUpload}
        onAbort={abort}
        onResume={resume}
        onRemove={removeItem}
        activeUploadId={activeUploadId}
        pausedUploadId={pausedUploadId}
      />
    </div>
  )
}
