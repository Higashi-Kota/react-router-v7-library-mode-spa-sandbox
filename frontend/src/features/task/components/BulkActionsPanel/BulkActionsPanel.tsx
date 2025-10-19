import { BulkDeleteForm } from './_components/BulkDeleteForm'
import { BulkUpdateForm } from './_components/BulkUpdateForm'

interface BulkActionsPanelProps {
  selectedIds: string[]
  redirectTo: string
  onCompleted: () => void
}

export function BulkActionsPanel({
  selectedIds,
  redirectTo,
  onCompleted,
}: BulkActionsPanelProps) {
  if (selectedIds.length === 0) {
    return null
  }

  return (
    <div className="card">
      <h3 className="section-title">一括操作</h3>
      <p className="subtle">選択中: {selectedIds.length} 件</p>
      <div className="bulk-actions">
        <BulkUpdateForm
          selectedIds={selectedIds}
          status="completed"
          label="全て完了にする"
          redirectTo={redirectTo}
          onCompleted={onCompleted}
        />
        <BulkDeleteForm
          selectedIds={selectedIds}
          redirectTo={redirectTo}
          onCompleted={onCompleted}
        />
      </div>
    </div>
  )
}
