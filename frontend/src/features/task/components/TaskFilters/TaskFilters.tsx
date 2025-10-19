import type { DashboardFiltersState } from '../../../../routes/dashboard/_types'

interface TaskFiltersProps {
  filtersState: DashboardFiltersState
  disabled: boolean
}

export function TaskFilters({ filtersState, disabled }: TaskFiltersProps) {
  const {
    statusValue,
    searchValue,
    handleStatusChange,
    handleSearchChange,
    handleSearchBlur,
    updateFiltersShallow,
  } = filtersState

  const inputsDisabled = disabled

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // 絞り込みボタンを押したら、現在の値で即座にフィルタを適用
    // updateFiltersShallow内部でfetcher.load()が実行されます
    updateFiltersShallow(statusValue, searchValue.trim())
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="form-field">
        <span>ステータスで絞り込み</span>
        <select
          name="status"
          value={statusValue}
          disabled={inputsDisabled}
          onChange={handleStatusChange}
        >
          <option value="">すべて</option>
          <option value="pending">未着手</option>
          <option value="in_progress">進行中</option>
          <option value="completed">完了</option>
        </select>
      </label>
      <label className="form-field">
        <span>キーワード検索</span>
        <input
          type="search"
          name="search"
          placeholder="タイトル・詳細から検索"
          value={searchValue}
          disabled={inputsDisabled}
          onChange={handleSearchChange}
          onBlur={handleSearchBlur}
        />
      </label>
      <div className="form-actions">
        <button className="button-secondary" type="submit" disabled={disabled}>
          絞り込み
        </button>
      </div>
    </form>
  )
}
