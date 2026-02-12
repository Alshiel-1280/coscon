"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { APP_NAME } from "@/lib/constants";

type AcceptState = "accepting" | "error";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams<{ token: string | string[] }>();
  const token = useMemo(() => {
    if (!params?.token) {
      return "";
    }
    return Array.isArray(params.token) ? params.token[0] ?? "" : params.token;
  }, [params]);

  const [state, setState] = useState<AcceptState>("accepting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    async function acceptInvite() {
      const response = await fetch(`/api/invite-links/${encodeURIComponent(token)}/accept`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: { projectId?: string };
        error?: string;
      };
      if (!active) {
        return;
      }
      if (!response.ok || !body.data?.projectId) {
        setState("error");
        setErrorMessage(body.error ?? "招待リンクの処理に失敗しました。");
        return;
      }
      router.replace(`/projects/${body.data.projectId}`);
    }

    void acceptInvite();
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
            <Link className="btn-outline text-sm" href="/projects">
              プロジェクト一覧へ
            </Link>
            <Link className="btn-outline text-sm" href="/login">
              ログイン画面へ
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (state === "accepting") {
    return (
      <main className="page">
        <section className="panel mx-auto max-w-xl space-y-3 p-8">
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          <p className="text-sm">招待リンクを確認して、プロジェクトへの参加処理を実行しています。</p>
          <p className="muted text-sm">完了後、自動でプロジェクト画面へ移動します。</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="panel mx-auto max-w-xl space-y-3 p-8">
        <h1 className="text-2xl font-bold">{APP_NAME}</h1>
        <p className="text-sm text-[var(--danger)]">{errorMessage ?? "招待リンクが無効です。"}</p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-outline text-sm" href="/projects">
            プロジェクト一覧へ
          </Link>
          <Link className="btn-outline text-sm" href="/login">
            ログイン画面へ
          </Link>
        </div>
      </section>
    </main>
  );
}
