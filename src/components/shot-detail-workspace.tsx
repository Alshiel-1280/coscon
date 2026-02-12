"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
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

const ALLOWED_REFERENCE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

function isAllowedReferenceFile(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  if (ALLOWED_REFERENCE_MIME_TYPES.has(mimeType)) {
    return true;
  }

  const lowerName = file.name.toLowerCase();
  return (
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".pdf")
  );
}

function drivePreviewUrl(asset: ShotAsset): string {
  return `https://drive.google.com/file/d/${asset.drive_file_id}/preview`;
}

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
  const [previewAsset, setPreviewAsset] = useState<ShotAsset | null>(null);
  const referenceAssets = useMemo(
    () => assets.filter((asset) => asset.kind === "reference"),
    [assets],
  );

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
    const formData = new FormData(event.currentTarget);
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (files.length === 0) {
      setMessage({
        kind: "error",
        message: "アップロードするファイルを選択してください。",
      });
      return;
    }

    if (referenceAssets.length + files.length > 3) {
      setMessage({
        kind: "error",
        message: "参考画像は最大3枚までです。",
      });
      return;
    }

    const invalidFile = files.find((file) => !isAllowedReferenceFile(file));
    if (invalidFile) {
      setMessage({
        kind: "error",
        message: "アップロード可能なのは JPG / PNG / PDF のみです。",
      });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      for (const file of files) {
        const uploadFormData = new FormData();
        uploadFormData.set("file", file);
        const response = await fetch(`/api/shots/${shot.id}/assets`, {
          method: "POST",
          body: uploadFormData,
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "画像アップロードに失敗しました。");
        }
      }
    } catch (error) {
      setUploading(false);
      setMessage({
        kind: "error",
        message: error instanceof Error ? error.message : "画像アップロードに失敗しました。",
      });
      return;
    }

    setUploading(false);
    await loadShot();
    setMessage({ kind: "success", message: `${files.length}件の参考画像をアップロードしました。` });
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
            <label className="mb-1 block text-sm font-semibold">キャラ</label>
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
          <h3 className="text-lg font-bold">参考画像</h3>
          <p className="muted text-xs">形式: JPG / PNG / PDF, 最大3枚</p>
          <p className="muted text-xs">登録済み: {referenceAssets.length} / 3</p>
          <form className="space-y-2" onSubmit={uploadAsset}>
            <div>
              <label className="mb-1 block text-xs font-semibold">ファイル</label>
              <input
                className="input"
                type="file"
                name="files"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                multiple
                required
              />
            </div>
            <button className="btn-primary text-sm" type="submit" disabled={uploading}>
              {uploading ? "アップロード中..." : "アップロード"}
            </button>
          </form>

          <div className="space-y-2">
            {referenceAssets.map((asset) => (
              <article key={asset.id} className="rounded-lg border border-[var(--border)] bg-white p-3">
                <p className="text-sm font-semibold">{asset.drive_file_name}</p>
                <p className="muted text-xs">{asset.mime_type}</p>
                <button className="btn-outline mt-2 text-sm" type="button" onClick={() => setPreviewAsset(asset)}>
                  プレビュー
                </button>
              </article>
            ))}
            {referenceAssets.length === 0 ? <p className="muted text-sm">参考画像はまだありません。</p> : null}
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

      {previewAsset ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewAsset(null);
            }
          }}
        >
          <section className="panel w-full max-w-4xl space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{previewAsset.drive_file_name}</p>
              <button className="btn-outline text-sm" type="button" onClick={() => setPreviewAsset(null)}>
                閉じる
              </button>
            </div>
            <iframe
              src={drivePreviewUrl(previewAsset)}
              title={`reference-preview-${previewAsset.id}`}
              className="h-[70vh] w-full rounded-lg border border-[var(--border)] bg-white"
            />
            {previewAsset.drive_web_view_link ? (
              <a className="link text-sm" href={previewAsset.drive_web_view_link} target="_blank" rel="noreferrer">
                Driveで開く
              </a>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
