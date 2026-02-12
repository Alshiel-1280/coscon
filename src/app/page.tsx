import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { hasSupabaseConfig } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  let isLoggedIn = false;
  if (hasSupabaseConfig()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = Boolean(user);
  }

  return (
    <main className="page">
      <section className="panel mx-auto max-w-4xl space-y-8 p-8 md:p-10">
        <header className="space-y-3">
          <p className="muted text-sm">Cosplay Storyboard Platform</p>
          <h1 className="text-3xl font-bold md:text-4xl">{APP_NAME}</h1>
          <p className="text-base leading-relaxed md:text-lg">
            {APP_NAME}
            は、コスプレ撮影の「絵コンテ」「ライティングメモ」「参考画像」を
            キャラごと・ショットごとに整理し、チームで共有するためのアプリです。
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-[var(--border)] bg-white p-4">
            <h2 className="text-base font-bold">目的</h2>
            <p className="muted mt-2 text-sm">
              撮影前の準備と撮影当日の進行を、1つの画面で迷わず管理するためのツールです。
            </p>
          </article>
          <article className="rounded-xl border border-[var(--border)] bg-white p-4">
            <h2 className="text-base font-bold">主な機能</h2>
            <p className="muted mt-2 text-sm">
              キャラごとのショット管理、参考画像アップロード、ライティング図面編集、メンバー招待に対応しています。
            </p>
          </article>
          <article className="rounded-xl border border-[var(--border)] bg-white p-4">
            <h2 className="text-base font-bold">データ連携</h2>
            <p className="muted mt-2 text-sm">
              Google Driveの `drive.file` スコープを利用し、アプリで扱うファイルを安全に保存・共有します。
            </p>
          </article>
        </section>

        <section className="flex flex-wrap items-center gap-2">
          <Link className="btn-primary text-sm" href={isLoggedIn ? "/projects" : "/login"}>
            {isLoggedIn ? "プロジェクト一覧へ" : "Googleでログイン"}
          </Link>
          <Link className="btn-outline text-sm" href="/terms">
            利用規約
          </Link>
          <Link className="btn-outline text-sm" href="/privacy">
            プライバシーポリシー
          </Link>
        </section>

        {!hasSupabaseConfig() ? (
          <section className="rounded-xl border border-[var(--border)] bg-white p-4">
            <h2 className="text-sm font-bold">開発環境向けメモ</h2>
            <p className="muted mt-2 text-sm">
              `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定後、Google OAuthと
              Driveスコープ `https://www.googleapis.com/auth/drive.file` を有効化してください。
            </p>
          </section>
        ) : null}
      </section>
    </main>
  );
}
