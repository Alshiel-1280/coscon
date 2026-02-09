"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ProjectCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title") ?? "").trim(),
      shootDate: String(formData.get("shootDate") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
    };

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json().catch(() => ({}))) as {
      data?: { id?: string };
      error?: string;
    };

    if (!response.ok || !body.data?.id) {
      setError(body.error ?? "プロジェクト作成に失敗しました。");
      setLoading(false);
      return;
    }

    router.push(`/projects/${body.data.id}`);
    router.refresh();
  }

  return (
    <form className="panel space-y-4 p-6" onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold">新規プロジェクト</h2>
      <div>
        <label className="mb-1 block text-sm font-semibold">タイトル *</label>
        <input className="input" name="title" required maxLength={120} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">撮影日</label>
        <input className="input" type="date" name="shootDate" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">場所</label>
        <input className="input" name="location" maxLength={200} />
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? "作成中..." : "作成する"}
      </button>
    </form>
  );
}
