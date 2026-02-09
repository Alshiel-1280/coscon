import { Suspense } from "react";
import { LoginCard } from "@/components/login-card";
import { hasSupabaseConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="page flex min-h-screen items-center justify-center">
      <div className="w-full max-w-xl space-y-4">
        {!hasSupabaseConfig() ? (
          <section className="panel p-6">
            <h1 className="text-xl font-bold">環境変数が未設定です</h1>
            <p className="muted mt-2 text-sm">
              `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY`
              を設定後、ページを再読み込みしてください。
            </p>
          </section>
        ) : (
          <Suspense fallback={<p className="muted text-sm">読み込み中...</p>}>
            <LoginCard />
          </Suspense>
        )}
      </div>
    </main>
  );
}
