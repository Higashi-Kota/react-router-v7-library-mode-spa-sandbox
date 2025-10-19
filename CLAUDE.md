# CLAUDE.md

このドキュメントは Claude Code (claude.ai/code) が本リポジトリで作業する際のリファレンスです。  
前提として **React Router 7.9.4（ライブラリモード）**・**Vite**・**React 19**・**TypeScript**・**PNPM ワークスペース**による SPA＋Express API の構成であることを忘れないでください。

## プロジェクト概要
- **frontend/**: React Router Data API をフル活用した SPA。フォーム送信・非同期 UI・未保存変更ガードなどを網羅したリファレンス実装。
- **backend/**: ESM + TypeScript + Express 4。タスク・添付ファイル・コメントの CRUD／Bulk エンドポイントを提供。
- **shared-config/**: TypeScript 共通設定。

## 重要なフロントエンドパターン
- ルート定義は `frontend/src/router.tsx` の `createBrowserRouter()` で一元管理。各ルートは `loader` / `action` / `Component` / `ErrorBoundary` をエクスポートする。
- `useLoaderData<typeof loader>()` / `useActionData<typeof action>()` / `useFetcher<typeof action>()` により型安全なデータパイプラインを構築。
- フォームは `<Form>` + `useSubmit()` + `_intent` 隠しフィールドで操作を分岐。`useTransition()` と併用してローディング状態を制御。
- `frontend/src/lib/useUnsavedChangesBlocker.ts` と `frontend/src/components/UnsavedChangesDialog.tsx` を組み合わせ、タスク作成 (`CreateForm`)・編集 (`UpdateForm`) で **CTA が有効な状態かつ未保存変更がある場合のみ** `useBlocker()` で遷移確認モーダルを表示する。
- 一括操作・詳細画面では `useFetcher()` を多用し、背景でのミューテーションとリスト再検証を実現。
- 添付管理は `features/attachment/core/attachment-upload-manager.ts` を中心に XHR ベースのアップロードキューを実装。

## バックエンド要点
- `backend/src/server.ts` がエントリーポイント。CORS + JSON ボディパーサー + ファイルアップロード (`busboy`) を構成。
- ルート:
  - `routes/tasks.ts`: CRUD + Bulk (`POST /api/tasks/bulk`)
  - `routes/attachments.ts`: 単一アップロード／複数アップロード／チャンクアップロード
  - `routes/comments.ts`: コメントツリー CRUD
- データストアは `store.ts` / `attachments-store.ts` / `comments-store.ts` にまとめたインメモリ実装。Zod によるバリデーションを必須とする。

## コマンド
```bash
pnpm install --recursive         # 初回セットアップ
pnpm dev:backend                 # http://localhost:4000
pnpm dev:frontend                # http://localhost:5173
pnpm build:backend && pnpm build:frontend
pnpm typecheck                   # frontend/backed の tsc --noEmit
pnpm format:check                # Biome v2
pnpm --filter frontend lint      # frontend の tsc --noEmit
pnpm --filter backend lint       # backend の tsc --noEmit
```

## 品質チェックとドキュメント整備
- コード変更時は必ず `pnpm --filter frontend lint` を実行し、React Router の型エラーを排除する。
- 新しいルーティングパターンや Data API の活用例を追加した場合は、`react-router.md` と `README.md` を更新してリファレンス性を維持する。
- UI/UX 振る舞いを変更した場合は、仕様を `README.md` の機能セクションおよび関連 Feature ドキュメントに追記する。

## 注意点
- React Router v7 の Framework Mode は採用していない。SSR や自動型生成はスコープ外。**ライブラリモードでのフル機能利用**を徹底する。
- 外部通信を伴う処理は `useFetcher()` または `useSubmit()` と Loader/Action の組み合わせで完結させる。クライアントサイド専用 API 呼び出しは避ける。
- 未保存変更を扱う場合は、まず `useUnsavedChangesBlocker` の再利用を検討し、重複実装を禁止する。
