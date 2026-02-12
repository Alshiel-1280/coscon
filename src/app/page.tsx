import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/constants";
import { hasSupabaseConfig } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!hasSupabaseConfig()) {
    return (
      <main className="page">
        <section className="panel mx-auto max-w-2xl space-y-3 p-8">
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          <p className="muted text-sm">
            まず環境変数を設定してください。`NEXT_PUBLIC_SUPABASE_URL` と
            `NEXT_PUBLIC_SUPABASE_ANON_KEY` が必要です。
          </p>
          <p className="muted text-sm">
            設定後、Google OAuth (Supabase) と Drive スコープ
            `https://www.googleapis.com/auth/drive.file` を有効化してください。
          </p>
          <Link className="btn-outline text-sm" href="/login">
            ログイン画面へ
          </Link>
        </section>
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/projects" : "/login");
}
