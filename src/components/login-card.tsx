"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginCard() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    if (!next || !next.startsWith("/")) {
      return "/projects";
    }
    return next;
  }, [searchParams]);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          scopes:
            "openid email profile https://www.googleapis.com/auth/drive.file",
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました。");
      setLoading(false);
    }
  }

  return (
    <div className="panel mx-auto max-w-xl p-8">
      <h1 className="mb-2 text-2xl font-bold">Googleでログイン</h1>
      <p className="muted mb-6 text-sm">
        Driveのプロジェクトフォルダと連携するため、Googleアカウントでサインインします。
      </p>
      <button className="btn-primary w-full" onClick={handleGoogleLogin} disabled={loading}>
        {loading ? "接続中..." : "Googleでサインイン"}
      </button>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
