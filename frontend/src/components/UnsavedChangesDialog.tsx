interface UnsavedChangesDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function UnsavedChangesDialog({
  open,
  onConfirm,
  onCancel,
}: UnsavedChangesDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-description"
      >
        <h3 id="unsaved-changes-title" className="section-title">
          ページを離れますか？
        </h3>
        <p id="unsaved-changes-description" className="subtle">
          保存されていない変更があります。このまま移動すると入力内容は破棄されます。
        </p>
        <div className="modal-actions">
          <button className="button-secondary" type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button className="button-primary" type="button" onClick={onConfirm}>
            移動する
          </button>
        </div>
      </div>
    </div>
  )
}
