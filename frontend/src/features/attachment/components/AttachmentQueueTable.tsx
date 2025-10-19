import type { UploadQueueItem } from '../hooks/useAttachmentUploader'
import { formatFileSize } from '../utils/format'

interface AttachmentQueueTableProps {
  items: UploadQueueItem[]
  isUploading: boolean
  canResume: boolean
  onStart: (ids: string[]) => void
  onAbort: () => void
  onResume: () => void
  onRemove: (id: string) => void
  activeUploadId: string | null
  pausedUploadId: string | null
}

export function AttachmentQueueTable({
  items,
  isUploading,
  canResume,
  onStart,
  onAbort,
  onResume,
  onRemove,
  activeUploadId,
  pausedUploadId,
}: AttachmentQueueTableProps) {
  if (items.length === 0) {
    return (
      <p className="subtle">まだアップロード予定のファイルはありません。</p>
    )
  }

  return (
    <div className="upload-table-wrapper">
      <table className="task-table upload-table">
        <thead>
          <tr>
            <th style={{ width: '40%' }}>ファイル名</th>
            <th>サイズ</th>
            <th>進捗</th>
            <th>ステータス</th>
            <th style={{ width: '200px' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <AttachmentQueueRow
              key={item.id}
              item={item}
              isUploading={isUploading}
              canResume={canResume}
              onStart={onStart}
              onAbort={onAbort}
              onResume={onResume}
              onRemove={onRemove}
              isActive={activeUploadId === item.id}
              isPaused={pausedUploadId === item.id && item.status === 'aborted'}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface AttachmentQueueRowProps {
  item: UploadQueueItem
  isUploading: boolean
  canResume: boolean
  onStart: (ids: string[]) => void
  onAbort: () => void
  onResume: () => void
  onRemove: (id: string) => void
  isActive: boolean
  isPaused: boolean
}

function AttachmentQueueRow({
  item,
  isUploading,
  canResume,
  onStart,
  onAbort,
  onResume,
  onRemove,
  isActive,
  isPaused,
}: AttachmentQueueRowProps) {
  const canStart =
    (item.status === 'ready' ||
      item.status === 'error' ||
      item.status === 'aborted') &&
    !isUploading
  const showAbort = isActive && item.status === 'uploading'
  const showResume = isPaused && canResume
  const canRemove =
    item.status !== 'uploading' &&
    item.status !== 'queued' &&
    !isActive &&
    !isPaused

  const statusLabel = (() => {
    switch (item.status) {
      case 'ready':
        return '待機中'
      case 'queued':
        return 'キュー待ち'
      case 'uploading':
        return 'アップロード中'
      case 'aborted':
        return '一時停止中'
      case 'completed':
        return '完了'
      case 'error':
        return item.error ? `エラー: ${item.error}` : 'エラー'
      default:
        return item.status
    }
  })()

  return (
    <tr>
      <td>{item.file.name}</td>
      <td>{formatFileSize(item.totalBytes)}</td>
      <td>{item.progress}%</td>
      <td>{statusLabel}</td>
      <td>
        <div className="upload-table-actions">
          {canStart && (
            <button
              className="button-secondary"
              type="button"
              onClick={() => onStart([item.id])}
            >
              アップロード
            </button>
          )}
          {showAbort && (
            <button
              className="button-secondary"
              type="button"
              onClick={onAbort}
            >
              中断
            </button>
          )}
          {showResume && (
            <button
              className="button-secondary"
              type="button"
              onClick={onResume}
            >
              再開
            </button>
          )}
          {canRemove && (
            <button
              className="button-secondary"
              type="button"
              onClick={() => onRemove(item.id)}
            >
              削除
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
