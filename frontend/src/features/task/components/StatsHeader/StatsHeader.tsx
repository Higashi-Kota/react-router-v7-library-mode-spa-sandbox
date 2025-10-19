import type { TaskStats } from '../../../../routes/dashboard/_types'

interface StatsHeaderProps {
  stats: TaskStats
  onRevalidate: () => void
}

export function StatsHeader({ stats, onRevalidate }: StatsHeaderProps) {
  return (
    <header className="app-header" style={{ padding: 0 }}>
      <div>
        <h3 className="section-title">現在のステータス</h3>
        <p className="subtle">
          合計 {stats.total} 件 / 未着手 {stats.byStatus.pending} / 進行中{' '}
          {stats.byStatus.in_progress} / 完了 {stats.byStatus.completed}
        </p>
      </div>
      <button className="button-secondary" type="button" onClick={onRevalidate}>
        最新化
      </button>
    </header>
  )
}
