# 撮影絵コンテアプリ MVP

Next.js + Supabase + Google Drive で構成した、コスプレ撮影向けの絵コンテ管理アプリです。

## 実装済みMVP
- Googleログイン（Supabase OAuth）
- プロジェクト作成（Driveフォルダ自動作成）
- プロジェクト招待（DBメンバー追加 + Driveフォルダ共有）
- シーン/ショット CRUD
- ショット必須項目: `title`, `status`
- ショットステータス: `構想 / 未撮影 / 撮影済 / 現像済 / 共有済`
- 参考画像/JPGアップロード（Drive保存 + DB管理）
- プロジェクト/ショットコメント
- ライティング配置エディタ（配置/回転/保存/PNG書き出し）
- 納品PDF出力（Drive `90_exports` 保存）

## 前提
- Node.js 20+
- Supabaseプロジェクト
- Google Cloud OAuth（Drive API有効化）

## セットアップ
1. 依存インストール
```bash
npm install
```

2. 環境変数を設定（`.env.local`）
```bash
cp .env.example .env.local
```

3. Supabaseにスキーマ適用
- `/Users/ryo1280/codex/docs/supabase_schema.sql` をSQL Editorで実行

4. Supabase Authentication設定
- Provider: Google を有効化
- Redirect URL に以下を追加
  - `http://localhost:3000/auth/callback`
  - `https://<your-vercel-domain>/auth/callback`

5. Google Cloud設定
- Drive API を有効化
- OAuth同意画面を設定
- Supabase側Google ProviderのClient ID/Secretを登録

6. 開発起動
```bash
npm run dev
```

7. ビルド確認
```bash
npm run build
```

## 主要ルート

- `/login`
- `/projects`
- `/projects/new`
- `/projects/[projectId]`
- `/projects/[projectId]/shots/[shotId]`

## API（MVP）
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/members`
- `POST /api/projects/:projectId/invite`
- `POST /api/projects/:projectId/scenes`
- `POST /api/scenes/:sceneId/shots`
- `PATCH /api/shots/:shotId`
- `POST /api/shots/:shotId/assets`
- `PUT /api/shots/:shotId/lighting`
- `POST /api/shots/:shotId/lighting/export`
- `POST /api/projects/:projectId/comments`
- `POST /api/shots/:shotId/comments`
- `POST /api/projects/:projectId/export/pdf`
- `GET /api/projects/:projectId/deliverables`

## Vercel本番
- 手順: `/Users/ryo1280/codex/docs/vercel-production-setup.md`

## 注意事項
- この環境では `@next/swc-darwin-arm64` が破損しているため、`dev/build` スクリプトは `--webpack` 固定にしています。
- RAWファイルは非対応で、JPG中心の運用を想定しています。
