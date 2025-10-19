import type { ShouldRevalidateFunctionArgs } from 'react-router'
import {
  isRouteErrorResponse,
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useNavigation,
  useRouteError,
} from 'react-router'
import { formatDateTime } from '../../lib/date'
import { rootLoader } from './_io/read'
import type { RootLoaderData } from './_types'

export { rootLoader }

export function shouldRevalidate({
  currentUrl,
  nextUrl,
}: ShouldRevalidateFunctionArgs): boolean {
  if (currentUrl.pathname !== nextUrl.pathname) {
    return true
  }
  return false
}

export function RootLayout() {
  const { health } = useLoaderData<RootLoaderData>()
  const navigation = useNavigation()
  const busy = navigation.state !== 'idle'

  const isOnline = Boolean(health)
  const statusLabel = isOnline ? 'API 接続中' : 'API 未接続'
  const statusTone = isOnline ? 'online' : 'offline'
  const lastChecked = health ? formatDateTime(health.timestamp) : '—'

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-main">
          <div>
            <h1 className="section-title">React Router 7 ハンズオン</h1>
            <p className="subtle">
              Vite + React + TypeScript + PNPM / フロントエンド &amp; CRUD API
              リファレンス
            </p>
          </div>
          <nav className="app-nav" aria-label="メインナビゲーション">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              ダッシュボード
            </NavLink>
            <NavLink
              to="/tasks/new"
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              新規作成
            </NavLink>
          </nav>
        </div>
        <div className="header-status" aria-live="polite">
          <span className="status-chip">
            <span className="status-dot" data-status={statusTone} aria-hidden />
            {statusLabel}
          </span>
          <time className="status-time" dateTime={health?.timestamp ?? ''}>
            最終確認: {lastChecked}
          </time>
        </div>
      </header>

      {busy && (
        <div className="loading-indicator" aria-live="polite">
          <span aria-hidden>⏳</span>
          <span>読み込み中…</span>
        </div>
      )}

      <main>
        {!health && (
          <div className="card" role="alert">
            <strong>API接続を確認してください</strong>
            <span className="subtle">
              バックエンドが起動していない場合は <code>pnpm dev:backend</code>{' '}
              を実行してください。
            </span>
            <Link to="/">再試行</Link>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}

export function RootErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <div className="card" role="alert">
        <h2 className="section-title">ルートエラー</h2>
        <p className="subtle">
          {error.status}: {error.statusText}
        </p>
      </div>
    )
  }

  return (
    <div className="card" role="alert">
      <h2 className="section-title">予期しないエラーが発生しました</h2>
      <pre className="code-block">
        {error instanceof Error ? error.message : String(error)}
      </pre>
    </div>
  )
}
