# React Router 7.9.4 Hands-on

React Router 7.9.4 を [**ライブラリモード**](https://github.com/remix-run/react-router/discussions/12423)で使い切ることを目的にしたタスク管理 SPA と、Express 製の CRUD + Bulk API のハンズオンプロジェクトです。フロントエンド・バックエンドとも TypeScript で実装し、PNPM ワークスペースで管理しています。

## 主な機能
- **タスクダッシュボード**: フィルタ・並び替え・統計・チェックボックス選択を備え、`useFetcher()` でバックグラウンド更新。
- **タスク作成／編集**: `<Form>` + `useSubmit()` + `useTransition()` の組み合わせで送信。未保存変更がある場合は `useBlocker()` ベースのモーダルで離脱確認。
- **添付ファイル管理**: チャンクアップロードを含むアップロードキュー（`features/attachment/core/attachment-upload-manager.ts`）で進捗・再送制御。
- **コメント管理**: タスク詳細配下の子ルートで CRUD を提供。`useFetcher()` による部分更新。
- **Bulk API 連携**: 選択タスクをまとめて更新／削除するフォームを `fetcher.Form` で実装。

## ディレクトリ構成
```
/                          # ルート (PNPM ワークスペース)
├─ frontend/               # React Router 7.9.4 SPA
│  ├─ src/router.tsx       # createBrowserRouter エントリ
│  ├─ src/routes/          # ルートごとの loader/action/Component
│  ├─ src/features/        # ドメイン別 UI・ロジック
│  └─ src/lib/useUnsavedChangesBlocker.ts
├─ backend/                # Express + Zod API
│  ├─ src/routes/          # tasks / attachments / comments
│  └─ src/attachments-store.ts 等
└─ shared-config/          # TypeScript 共通設定
```

## セットアップ
```bash
pnpm install --recursive
```

### 開発サーバー
| コマンド | 役割 | URL |
| --- | --- | --- |
| `pnpm dev:backend` | Express API | http://localhost:4000 |
| `pnpm dev:frontend` | Vite Dev Server | http://localhost:5173 |

ダッシュボードは `/`、タスク作成は `/tasks/new`、編集は `/tasks/:taskId/edit`、詳細は `/tasks/:taskId` で確認できます。

### 品質チェック
```bash
pnpm --filter frontend lint   # frontend: tsc --noEmit
pnpm --filter backend lint    # backend: tsc --noEmit
pnpm typecheck                # ルートから一括
pnpm format:check             # Biome v2
```

## React Router 実装のハイライト
- ルートは `createBrowserRouter()` で宣言し、`loader` / `action` / `ErrorBoundary` をすべてオブジェクトリテラルで渡す。
- フォーム送信は `<Form>` または `useSubmit()` を用い、`_intent` 隠しフィールドで操作を切り替える。
- `useBlocker()` をラップした `useUnsavedChangesBlocker` をタスク作成・編集フォームで利用し、CTA が有効かつ未保存変更が存在するときのみ離脱モーダル (`UnsavedChangesDialog`) を表示。
- `useFetcher()` を活用して一覧のフィルタ更新、ステータス変更、添付ファイル／コメントの CRUD を遷移なしで処理。
- 再検証制御 (`shouldRevalidate`) や `preventScrollReset` により UX を最適化。

詳細なルーターの使い方は `react-router.md` を参照してください。

## バックエンド API エンドポイント
| メソッド | パス | 内容 |
| --- | --- | --- |
| GET | `/health` | ヘルスチェック |
| GET | `/api/tasks` | タスク一覧（検索・ステータスフィルタ対応） |
| GET | `/api/tasks/:id` | タスク詳細 |
| POST | `/api/tasks` | タスク作成 |
| PATCH | `/api/tasks/:id` | タスク部分更新 |
| PUT | `/api/tasks/:id` | タスク全項目更新 |
| DELETE | `/api/tasks/:id` | タスク削除 |
| POST | `/api/tasks/bulk` | 一括 Create / Update / Delete |
| GET | `/api/tasks/:taskId/attachments` | 添付ファイル一覧 |
| POST | `/api/tasks/:taskId/attachments` | 単一・複数ファイルアップロード |
| POST | `/api/tasks/:taskId/attachments/chunk` | チャンクアップロード（再送・再開対応） |
| GET | `/api/tasks/:taskId/attachments/chunk/:uploadId` | チャンクアップロード状態取得 |
| DELETE | `/api/tasks/:taskId/attachments/:attachmentId` | 添付削除 |
| GET | `/api/tasks/:taskId/comments` | コメント一覧 |
| POST | `/api/tasks/:taskId/comments` | コメント作成 |
| PATCH | `/api/tasks/:taskId/comments/:commentId` | コメント更新 |
| DELETE | `/api/tasks/:taskId/comments/:commentId` | コメント削除 |

## 検証シナリオ
1. タスク作成ページでタイトルを入力し、CTA が有効な状態で戻る操作 → 未保存確認モーダル表示。
2. 同条件で「タスクを追加」を押下 → モーダルを介さず保存され、`redirectTo` に従って遷移。
3. タスク詳細で添付ファイルを追加し、アップロード完了後に一覧へ反映されることを確認。
4. コメントタブで投稿・編集・削除が `useFetcher()` を通じて即時反映されることを確認。

この README と併せて `CLAUDE.md` / `AGENTS.md` / `react-router.md` を参照し、リファレンス実装としての整合性を保ちながら機能追加・改善を行ってください。
