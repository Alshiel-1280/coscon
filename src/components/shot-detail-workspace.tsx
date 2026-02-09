"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { SHOT_STATUSES } from "@/lib/constants";
import type { Comment, LightingDiagram, Shot, ShotAsset } from "@/types/app";

const LightingEditor = dynamic(
  async () => import("@/components/lighting-editor").then((module) => module.LightingEditor),
  { ssr: false },
);

type SceneSummary = {
  id: string;
  title: string;
  sort_order: number;
};

type SaveMessage = {
  kind: "error" | "success";
  message: string;
};

export function ShotDetailWorkspace(props: {
  projectId: string;
  projectTitle: string;
  scenes: SceneSummary[];
  initialShot: Shot;
  initialAssets: ShotAsset[];
  initialLighting: LightingDiagram | null;
  initialComments: Comment[];
}) {
  const [shot, setShot] = useState<Shot>(props.initialShot);
  const [assets, setAssets] = useState<ShotAsset[]>(props.initialAssets);
  const [lighting, setLighting] = useState<LightingDiagram | null>(props.initialLighting);
  const [comments, setComments] = useState<Comment[]>(props.initialComments);
  const [message, setMessage] = useState<SaveMessage | null>(null);
  const [savingShot, setSavingShot] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [commentBody, setCommentBody] = useState("");

  async function loadShot() {
    const response = await fetch(`/api/shots/${shot.id}`, { cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as {
      data?: { shot?: Shot; assets?: ShotAsset[]; lighting?: LightingDiagram | null };
      error?: string;
    };
    if (!response.ok || !body.data?.shot) {
      throw new Error(body.error ?? "ショット情報の更新に失敗しました。");
    }
    setShot(body.data.shot);
    setAssets(body.data.assets ?? []);
    setLighting(body.data.lighting ?? null);
  }

  async function loadComments() {
    const response = await fetch(`/api/shots/${shot.id}/comments`, { cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as {
      data?: Comment[];
      error?: string;
    };
    if (!response.ok || !body.data) {
      throw new Error(body.error ?? "コメント更新に失敗しました。");
    }
    setComments(body.data);
  }

  async function saveShot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingShot(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title") ?? "").trim(),
      status: String(formData.get("status") ?? ""),
      compositionMemo: String(formData.get("compositionMemo") ?? ""),
      sceneId: String(formData.get("sceneId") ?? shot.scene_id),
    };
    const response = await fetch(`/api/shots/${shot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => ({}))) as {
      data?: Shot;
      error?: string;
    };
    setSavingShot(false);
    if (!response.ok || !body.data) {
      setMessage({
        kind: "error",
        message: body.error ?? "ショット更新に失敗しました。",
      });
      return;
    }
    setShot(body.data);
    setMessage({ kind: "success", message: "ショットを更新しました。" });
  }

  async function uploadAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/shots/${shot.id}/assets`, {
      method: "POST",
      body: formData,
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setUploading(false);
    if (!response.ok) {
      setMessage({
        kind: "error",
        message: body.error ?? "画像アップロードに失敗しました。",
      });
      return;
    }
    await loadShot();
    setMessage({ kind: "success", message: "画像をアップロードしました。" });
    event.currentTarget.reset();
  }

  async function saveLighting(diagram: Record<string, unknown>) {
    const response = await fetch(`/api/shots/${shot.id}/lighting`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagramJson: diagram }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      data?: LightingDiagram;
      error?: string;
    };
    if (!response.ok || !body.data) {
      throw new Error(body.error ?? "図面保存に失敗しました。");
    }
    setLighting(body.data);
    setMessage({ kind: "success", message: "ライティング図面を保存しました。" });
  }

  async function exportLighting(pngDataUrl: string) {
    const response = await fetch(`/api/shots/${shot.id}/lighting/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pngDataUrl,
        fileName: `${shot.title}_lighting`,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(body.error ?? "PNG書き出しに失敗しました。");
    }
    await loadShot();
    setMessage({ kind: "success", message: "PNGをDriveに保存しました。" });
  }

  async function postComment() {
    if (!commentBody.trim()) {
      return;
    }
    setPostingComment(true);
    setMessage(null);
    const response = await fetch(`/api/shots/${shot.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody.trim() }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setPostingComment(false);
    if (!response.ok) {
      setMessage({
        kind: "error",
        message: body.error ?? "コメント投稿に失敗しました。",
      });
      return;
    }
    setCommentBody("");
    await loadComments();
  }

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="muted text-sm">プロジェクト</p>
            <h2 className="text-xl font-bold">{props.projectTitle}</h2>
            <p className="muted text-sm">ショットID: {shot.id}</p>
          </div>
          <div className="flex gap-2">
            <Link className="btn-outline text-sm" href={`/projects/${props.projectId}`}>
              プロジェクトに戻る
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <p className={`text-sm ${message.kind === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          {message.message}
        </p>
      ) : null}

      <section className="split">
        <form className="panel space-y-3 p-5" onSubmit={saveShot}>
          <h3 className="text-lg font-bold">ショット基本情報</h3>
          <div>
            <label className="mb-1 block text-sm font-semibold">タイトル *</label>
            <input className="input" name="title" defaultValue={shot.title} required maxLength={120} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">ステータス *</label>
            <select className="select" name="status" defaultValue={shot.status}>
              {SHOT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">シーン</label>
            <select className="select" name="sceneId" defaultValue={shot.scene_id}>
              {props.scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">構図メモ</label>
            <textarea
              className="textarea"
              name="compositionMemo"
              defaultValue={shot.composition_memo ?? ""}
              maxLength={2000}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={savingShot}>
            {savingShot ? "保存中..." : "保存"}
          </button>
        </form>

        <div className="panel space-y-3 p-5">
          <h3 className="text-lg font-bold">参考画像 / 納品画像</h3>
          <form className="space-y-2" onSubmit={uploadAsset}>
            <div>
              <label className="mb-1 block text-xs font-semibold">種類</label>
              <select className="select" name="kind" defaultValue="reference">
                <option value="reference">参考画像 (JPG)</option>
                <option value="edit">現像後 (JPG)</option>
                <option value="export">書き出し</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">ファイル</label>
              <input className="input" type="file" name="file" required />
            </div>
            <button className="btn-primary text-sm" type="submit" disabled={uploading}>
              {uploading ? "アップロード中..." : "アップロード"}
            </button>
          </form>

          <div className="space-y-2">
            {assets.map((asset) => (
              <article key={asset.id} className="rounded-lg border border-[var(--border)] bg-white p-3">
                <p className="text-sm font-semibold">{asset.drive_file_name}</p>
                <p className="muted text-xs">種別: {asset.kind}</p>
                {asset.drive_web_view_link ? (
                  <a className="link text-sm" href={asset.drive_web_view_link} target="_blank" rel="noreferrer">
                    Driveで開く
                  </a>
                ) : null}
              </article>
            ))}
            {assets.length === 0 ? <p className="muted text-sm">アセットはまだありません。</p> : null}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold">ライティング図面</h3>
        <LightingEditor
          initialDiagram={(lighting?.diagram_json as Record<string, unknown> | null) ?? null}
          onSave={saveLighting}
          onExportPng={exportLighting}
        />
      </section>

      <section className="panel space-y-3 p-5">
        <h3 className="text-lg font-bold">ショットコメント</h3>
        <div className="space-y-2">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-lg border border-[var(--border)] bg-white p-3">
              <p className="text-sm font-semibold">
                {comment.user?.display_name ?? "メンバー"}{" "}
                <span className="muted font-normal">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
            </article>
          ))}
          {comments.length === 0 ? <p className="muted text-sm">コメントはまだありません。</p> : null}
        </div>
        <div className="space-y-2">
          <textarea
            className="textarea"
            value={commentBody}
            placeholder="コメントを書く"
            onChange={(event) => setCommentBody(event.target.value)}
          />
          <button className="btn-primary" type="button" onClick={postComment} disabled={postingComment}>
            {postingComment ? "送信中..." : "送信"}
          </button>
        </div>
      </section>
    </div>
  );
}
