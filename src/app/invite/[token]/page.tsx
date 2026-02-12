"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { APP_NAME } from "@/lib/constants";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type InviteState =
  | "loading"
  | "accepting"
  | "need-login"
  | "invalid"
  | "error";

type InvitePreview = {
  projectId: string;
  projectTitle: string;
};

function loginHrefForToken(token: string): string {
  return `/login?next=${encodeURIComponent(`/invite/${token}`)}`;
}

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams<{ token: string | string[] }>();
  const token = useMemo(() => {
    if (!params?.token) {
      return "";
    }
    return Array.isArray(params.token) ? params.token[0] ?? "" : params.token;
  }, [params]);

  const [state, setState] = useState<InviteState>("loading");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    async function handleInviteAccess() {
      setState("loading");
      setErrorMessage(null);

      const previewResponse = await fetch(`/api/invite-links/${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      const previewBody = (await previewResponse.json().catch(() => ({}))) as {
        data?: InvitePreview;
        error?: string;
      };
      if (!active) {
        return;
      }
      if (!previewResponse.ok || !previewBody.data?.projectId) {
        if (previewResponse.status === 404) {
          setState("invalid");
          setErrorMessage(previewBody.error ?? "招待リンクが無効です。");
          return;
        }
        setState("error");
        setErrorMessage(previewBody.error ?? "招待リンク情報の取得に失敗しました。");
        return;
      }

      setPreview(previewBody.data);
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) {
        return;
      }
      if (!user) {
        setState("need-login");
        return;
      }

      setState("accepting");
      const acceptResponse = await fetch(`/api/invite-links/${encodeURIComponent(token)}/accept`, {
        method: "POST",
      });
      const acceptBody = (await acceptResponse.json().catch(() => ({}))) as {
        data?: { projectId?: string };
        error?: string;
      };
      if (!active) {
        return;
      }
      if (acceptResponse.ok && acceptBody.data?.projectId) {
        router.replace(`/projects/${acceptBody.data.projectId}`);
        return;
      }
      if (acceptResponse.status === 401) {
        setState("need-login");
        return;
      }
      if (acceptResponse.status === 404) {
        setState("invalid");
        setErrorMessage(acceptBody.error ?? "招待リンクが無効です。");
        return;
      }
      setState("error");
      setErrorMessage(acceptBody.error ?? "招待リンクの処理に失敗しました。");
    }

    void handleInviteAccess();
    return () => {
      active = false;
    };
  }, [router, token]);

  if (!token) {
    return (
      <main className="page">
        <section className="panel mx-auto max-w-xl space-y-3 p-8">
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          <p className="text-sm text-[var(--danger)]">招待リンクが不正です。</p>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-outline text-sm" href={loginHrefForToken(token)}>
              ログイン画面へ
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (state === "loading" || state === "accepting") {
    return (
      <main className="page">
        <section className="panel mx-auto max-w-xl space-y-3 p-8">
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          {preview ? (
            <p className="text-sm">
              招待中プロジェクト: <span className="font-semibold">{preview.projectTitle}</span>
            </p>
          ) : null}
          <p className="text-sm">招待リンクを確認して、プロジェクトへの参加処理を実行しています。</p>
          <p className="muted text-sm">完了後、自動でプロジェクト画面へ移動します。</p>
        </section>
      </main>
    );
  }

  if (state === "need-login") {
    return (
      <main className="page">
        <section className="panel mx-auto max-w-xl space-y-3 p-8">
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          {preview ? (
            <p className="text-sm">
              招待中プロジェクト: <span className="font-semibold">{preview.projectTitle}</span>
            </p>
          ) : null}
          <p className="text-sm">プロジェクトへ参加するにはログインが必要です。</p>
          <p className="muted text-sm">ログイン後は自動で招待処理に戻り、プロジェクトへ遷移します。</p>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-primary text-sm" href={loginHrefForToken(token)}>
              ログインして参加
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="panel mx-auto max-w-xl space-y-3 p-8">
        <h1 className="text-2xl font-bold">{APP_NAME}</h1>
        {preview ? (
          <p className="text-sm">
            招待中プロジェクト: <span className="font-semibold">{preview.projectTitle}</span>
          </p>
        ) : null}
        <p className="text-sm text-[var(--danger)]">{errorMessage ?? "招待リンクが無効です。"}</p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-outline text-sm" href={loginHrefForToken(token)}>
            ログイン画面へ
          </Link>
        </div>
      </section>
    </main>
  );
}
