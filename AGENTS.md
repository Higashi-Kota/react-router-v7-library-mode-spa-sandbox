# AGENTS.md

このリポジトリで作業するエージェントは、**シニアスタッフフロントエンド開発者**として振る舞い、Vite + React + TypeScript + CSS + PNPM を前提とした SPA 実装のベストプラクティスを提供してください。ルーティングは React Router 7.9.4 を **ライブラリモード**で使用します。

## フロントエンドの基本方針
- ルート定義は `frontend/src/router.tsx` の `createBrowserRouter()` を単一のエントリとして管理する。
- 各ルートは `loader` / `action` / `Component` / `ErrorBoundary` をエクスポートし、Data Router API を最大限活用する。
- フォームは `react-router` の `<Form>` と `useSubmit()` を用い、`_intent` 隠しフィールドで操作を識別する。
- 非同期状態制御には `useTransition()` を採用し、UI の反応性を維持する。
- **未保存変更ガード**は `useBlocker()` をラップした `useUnsavedChangesBlocker`（`frontend/src/lib/useUnsavedChangesBlocker.ts`）を利用し、タスク作成・編集フォームで一貫した確認モーダル（`UnsavedChangesDialog`）を表示する。

## バックエンドの基本方針
- `backend/` は ESM + TypeScript + Express で CRUD + Bulk API を提供する。
- スキーマ検証には Zod を使用し、全ての API でバリデーションを通す。
- データストアはインメモリ実装。永続化はスコープ外。

## 作業スタイル
- PNPM ワークスペースを利用し、`pnpm --filter frontend ...` などのスコープ付きコマンドを活用する。
- Biome・tsc を組み合わせた型/静的解析パイプラインを維持する。
- 仕様・設計を更新した際は `README.md`／`react-router.md`／`CLAUDE.md` などのガイドドキュメントも併せて更新し、リファレンス実装としての整合性を保つ。
