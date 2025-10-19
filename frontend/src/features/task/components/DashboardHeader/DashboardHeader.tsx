import { Link } from 'react-router'

interface DashboardHeaderProps {
  redirectTo: string
}

export function DashboardHeader({ redirectTo }: DashboardHeaderProps) {
  return (
    <header className="app-header" style={{ padding: 0 }}>
      <div>
        <h2 className="section-title">タスク一覧</h2>
        <p className="subtle">
          React Router Data API を活用した一覧・一括操作のデモです。
        </p>
      </div>
      <Link
        className="button-primary"
        to={`/tasks/new?redirect=${encodeURIComponent(redirectTo)}`}
      >
        新しいタスクを作成
      </Link>
    </header>
  )
}
