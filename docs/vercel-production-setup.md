# Vercel 本番デプロイ手順（撮影絵コンテアプリ）

最終更新: 2026-02-09

## 1. Vercel プロジェクト作成
1. GitHub連携で `/Users/ryo1280/codex` をインポート
2. Framework: `Next.js`
3. Build Command: `npm run build`
4. Install Command: `npm install`

## 2. Vercel 環境変数
Vercel Project Settings -> Environment Variables に以下を設定:

- `NEXT_PUBLIC_APP_URL`
  - 本番: `https://<your-vercel-domain>`
- `NEXT_PUBLIC_SUPABASE_URL`
  - 例: `https://xxxxx.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabaseのanon key

## 3. Supabase Auth 設定
Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL:
  - `https://<your-vercel-domain>`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://<your-vercel-domain>/auth/callback`

## 4. Google OAuth（Supabase Provider）
Supabase Dashboard -> Authentication -> Providers -> Google:

- Google Cloud Consoleで OAuth Client を作成
- Authorized redirect URI は Supabase 指定値を登録
- Supabaseの Google Provider に Client ID / Secret を設定

Drive連携のため、ログイン時スコープ:
- `https://www.googleapis.com/auth/drive.file`

## 5. Google Drive API
Google Cloud Console:
- Drive API を有効化
- OAuth 同意画面を公開可能状態にする（テストユーザー運用でも可）

## 6. DB マイグレーション
Supabase SQL Editor で以下を実行:
- `/Users/ryo1280/codex/docs/supabase_schema.sql`

## 7. デプロイ確認チェック
デプロイ後に次を確認:
1. `/login` でGoogleログインできる
2. `/projects/new` でプロジェクト作成時にDriveフォルダが作成される
3. `/projects/[projectId]` でメンバー招待できる
4. `delivery` タブでPDF出力し、Drive `90_exports` に保存される
