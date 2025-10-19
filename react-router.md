# React Router 7.9.4 リファレンス（ライブラリモード）

このプロジェクトは React Router 7.9.4 を **ライブラリモード**で採用し、Data Router API を最大限に活用した SPA を構築しています。ここでは実装済みの機能に対応した要点のみを整理します。

## ルーター構成
- ルートツリーは `frontend/src/router.tsx` の `createBrowserRouter()` で宣言。
- 各ルートは `loader` / `action` / `Component` / `ErrorBoundary` をエクスポートし、`router` に生オブジェクトとして渡す。
- ネスト構造:
  - `/` (`RootLayout`) … ダッシュボード等の共通レイアウト。
  - `/tasks` … 一覧。`dashboardLoader`/`dashboardAction` を再利用。
  - `/tasks/new` … 作成フォーム。`taskCreateLoader` で初期値、`taskCreateAction` で登録。
  - `/tasks/:taskId/edit` … 編集フォーム。`taskEditLoader` + `taskEditAction`。
  - `/tasks/:taskId` … 詳細画面。子ルートとして `attachments` と `comments` を持つ。
  - `/tasks/bulk` … 一括操作専用アクション（UI からは `useFetcher` 経由で呼び出し）。

## Data Router API パターン
- **ローダー**: `useLoaderData<typeof loader>()` で型安全にデータ取得。例: `frontend/src/routes/tasks/detail/route.tsx`。
- **アクション**: `<Form method="post">` や `useSubmit()` から送信されるフォームデータをハンドリング。複数の操作を `_intent` 隠しフィールドで切り替え。
- **shouldRevalidate**: ルート単位で再検証を制御。例: `rootShouldRevalidate`。
- **ErrorBoundary**: ルートごとに定義し、`loader`/`action` の失敗をキャッチ。

## フォーム送信と UI 状態管理
- `<Form>` + `useSubmit()` + `useTransition()` を組み合わせ、非同期送信中は CTA を `busy` 状態に切り替える（`CreateForm` / `UpdateForm` / `DeleteForm`）。
- `_intent` フィールドでアクションを分岐し、単一ルートに複数操作を集約。例: `frontend/src/routes/dashboard/route.tsx` のフィルタ更新とタスク操作。
- `preventScrollReset: true` を活用し、SPA 内での微細な更新時にスクロール位置を維持。

## ナビゲーションブロック（useBlocker）
- `frontend/src/lib/useUnsavedChangesBlocker.ts` で `useBlocker()` をカプセル化し、未保存状態でのページ遷移を制御。
- `CreateForm` / `UpdateForm` では以下の条件でブロックを有効化:
  1. 入力がバリデーションを通過している。
  2. 初期値から変更がある。
  3. 送信処理中ではない。
- 送信時は `flushSync` で即座にブロック解除フラグを立て、モーダルが表示されないまま保存できる。
- ブロック発火時は `UnsavedChangesDialog` を表示し、ユーザー操作に応じて `blocker.proceed()` / `blocker.reset()` を呼び出す。

## useFetcher の活用
- `useFetcher()` を使い、遷移せずにアクション/ローダーを呼び出す。
  - ダッシュボードのフィルタ (`filterFetcher`)。
  - タスク行からのステータス変更 (`TaskRow` 内 `updateFetcher`)。
  - 添付ファイル／コメントの CRUD 操作。`fetcher.state` を監視してローディング表示を制御。
- `fetcher.Form` でプログレッシブエンハンスメントを維持しつつ、背景ミューテーションを実現。

## ルーティングヘルパー
- `redirectTo` 隠しフィールドで、操作後の復帰先を制御。
- `startTransition()` と併用し、テーブル更新やフィルタ変更をスムーズに再評価。
- `Link` は `react-router` からインポートし、`replace` や `preventScrollReset` を必要に応じて指定。

## テスト・検証のポイント
- フォーム編集 → CTA 有効 → 戻る操作で未保存ダイアログが出るか確認。
- ダイアログで「移動する」を選択した際に `blocker.proceed()` が呼ばれ、ナビゲーションが継続するか確認。
- 保存ボタン押下時はダイアログが表示されず、アクション完了後にリダイレクトされることを確認。

このガイドを基に、React Router 7.9.4 のライブラリモードにおける機能を横断的に活用し、変更時には該当セクションを更新してください。
