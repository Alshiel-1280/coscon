"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  Comment,
  Deliverable,
  ProjectDetail,
  ProjectMember,
  ProjectTabKey,
  Scene,
} from "@/types/app";
import { SHOT_STATUSES } from "@/lib/constants";

type TabKey = ProjectTabKey;

function tabLabel(tab: TabKey): string {
  switch (tab) {
    case "storyboard":
      return "絵コンテ";
    case "lighting":
      return "ライティング";
    case "comments":
      return "コメント";
    case "delivery":
      return "納品";
    default:
      return tab;
  }
}

export function ProjectWorkspace(props: {
  projectId: string;
  initialTab: TabKey;
  initialData: ProjectDetail;
  initialComments: Comment[];
  initialMembers: ProjectMember[];
  initialDeliverables: Deliverable[];
}) {
  const [tab, setTab] = useState<TabKey>(props.initialTab);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProjectDetail>(props.initialData);
  const [comments, setComments] = useState<Comment[]>(props.initialComments);
  const [members, setMembers] = useState<ProjectMember[]>(props.initialMembers);
  const [deliverables, setDeliverables] = useState<Deliverable[]>(
    props.initialDeliverables,
  );
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");

  async function loadProject() {
    const response = await fetch(`/api/projects/${props.projectId}`, {
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as {
      data?: ProjectDetail;
      error?: string;
    };
    if (!response.ok || !body.data) {
      setError(body.error ?? "プロジェクト取得に失敗しました。");
      return;
    }
    setData(body.data);
  }

  async function loadComments() {
    const response = await fetch(`/api/projects/${props.projectId}/comments`, {
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as {
      data?: Comment[];
      error?: string;
    };
    if (!response.ok || !body.data) {
      setError(body.error ?? "コメント取得に失敗しました。");
      return;
    }
    setComments(body.data);
  }

  async function loadMembers() {
    const response = await fetch(`/api/projects/${props.projectId}/members`, {
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as {
      data?: ProjectMember[];
      error?: string;
    };
    if (!response.ok || !body.data) {
      setError(body.error ?? "メンバー取得に失敗しました。");
      return;
    }
    setMembers(body.data);
  }

  async function loadDeliverables() {
    const response = await fetch(`/api/projects/${props.projectId}/deliverables`, {
      cache: "no-store",
    });
    const body = (await response.json().catch(() => ({}))) as {
      data?: Deliverable[];
      error?: string;
    };
    if (!response.ok || !body.data) {
      setError(body.error ?? "納品物取得に失敗しました。");
      return;
    }
    setDeliverables(body.data);
  }

  const allShots = useMemo(() => {
    return data.scenes.flatMap((scene) => scene.shots ?? []);
  }, [data]);

  async function switchTab(nextTab: TabKey) {
    setTab(nextTab);
    if (nextTab === "comments") {
      await loadComments();
    }
    if (nextTab === "delivery") {
      await loadDeliverables();
    }
  }

  async function addScene() {
    if (!newSceneTitle.trim()) return;
    setSaving(true);
    const response = await fetch(`/api/projects/${props.projectId}/scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSceneTitle.trim() }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "シーン追加に失敗しました。");
      return;
    }
    setNewSceneTitle("");
    await loadProject();
  }

  async function addShot(sceneId: string, title: string) {
    if (!title.trim()) return;
    setSaving(true);
    const response = await fetch(`/api/scenes/${sceneId}/shots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), status: "構想" }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "ショット追加に失敗しました。");
      return;
    }
    await loadProject();
  }

  async function updateShotStatus(shotId: string, status: string) {
    setSaving(true);
    const response = await fetch(`/api/shots/${shotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "ステータス更新に失敗しました。");
      return;
    }
    await loadProject();
  }

  async function moveShot(scene: Scene, index: number, direction: -1 | 1) {
    const shots = [...(scene.shots ?? [])];
    const target = index + direction;
    if (target < 0 || target >= shots.length) return;
    const tmp = shots[index];
    shots[index] = shots[target];
    shots[target] = tmp;
    const payload = {
      items: shots.map((shot, idx) => ({
        id: shot.id,
        sortOrder: idx,
      })),
    };
    setSaving(true);
    const response = await fetch("/api/shots/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "並び替えに失敗しました。");
      return;
    }
    await loadProject();
  }

  async function postComment() {
    if (!newComment.trim()) return;
    setSaving(true);
    const response = await fetch(`/api/projects/${props.projectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newComment.trim() }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "コメント投稿に失敗しました。");
      return;
    }
    setNewComment("");
    await loadComments();
  }

  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/projects/${props.projectId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "招待に失敗しました。");
      return;
    }
    setInviteEmail("");
    await loadMembers();
  }

  async function exportProjectPdf() {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/projects/${props.projectId}/export/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        includeComments: true,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "PDF出力に失敗しました。");
      return;
    }
    await loadDeliverables();
    setTab("delivery");
  }

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{data.project.title}</h2>
            <p className="muted text-sm">
              撮影日: {data.project.shoot_date ?? "-"} / 場所: {data.project.location ?? "-"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">{data.project.status}</span>
            {data.project.drive_folder_url ? (
              <a className="btn-outline text-sm" href={data.project.drive_folder_url} target="_blank" rel="noreferrer">
                Driveフォルダを開く
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h3 className="text-lg font-bold">メンバー招待</h3>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-sm"
            type="email"
            placeholder="招待するメールアドレス"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
          />
          <select
            className="select max-w-[150px]"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as "editor" | "viewer")}
          >
            <option value="editor">編集者 (editor)</option>
            <option value="viewer">閲覧者 (viewer)</option>
          </select>
          <button className="btn-primary" type="button" onClick={inviteMember} disabled={saving}>
            招待
          </button>
          <button className="btn-outline text-sm" type="button" onClick={() => void loadMembers()}>
            更新
          </button>
        </div>
        <div className="grid-cards">
          {members.map((member) => (
            <article key={member.user_id} className="rounded-lg border border-[var(--border)] bg-white p-3">
              <p className="font-semibold">{member.profile?.display_name ?? member.profile?.email ?? member.user_id}</p>
              <p className="muted text-sm">{member.profile?.email ?? "-"}</p>
              <span className="badge mt-2">{member.role}</span>
            </article>
          ))}
          {members.length === 0 ? <p className="muted text-sm">メンバー情報がありません。</p> : null}
        </div>
      </section>

      <nav className="tabs">
        {(Object.keys({
          storyboard: true,
          lighting: true,
          comments: true,
          delivery: true,
        }) as TabKey[]).map((tabKey) => (
          <button
            key={tabKey}
            className={`tab-link ${tab === tabKey ? "active" : ""}`}
            onClick={() => {
              void switchTab(tabKey);
            }}
            type="button"
          >
            {tabLabel(tabKey)}
          </button>
        ))}
      </nav>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {tab === "storyboard" ? (
        <section className="space-y-4">
          <div className="panel flex flex-wrap items-center gap-2 p-4">
            <input
              className="input max-w-sm"
              placeholder="新しいシーン名"
              value={newSceneTitle}
              onChange={(event) => setNewSceneTitle(event.target.value)}
            />
            <button className="btn-primary" type="button" onClick={addScene} disabled={saving}>
              シーン追加
            </button>
          </div>

          {data.scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              saving={saving}
              onAddShot={addShot}
              onMoveShot={moveShot}
              onUpdateShotStatus={updateShotStatus}
            />
          ))}
        </section>
      ) : null}

      {tab === "lighting" ? (
        <section className="panel p-5">
          <h3 className="mb-2 text-lg font-bold">ライティング編集対象</h3>
          <p className="muted mb-4 text-sm">
            各ショット詳細で配置図を作成・保存できます。PNG書き出しにも対応しています。
          </p>
          <div className="space-y-2">
            {allShots.map((shot) => (
              <div
                key={shot.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-white p-3"
              >
                <div>
                  <p className="font-semibold">{shot.title}</p>
                  <span className={`badge status-${shot.status}`}>{shot.status}</span>
                </div>
                <Link className="btn-outline text-sm" href={`/projects/${props.projectId}/shots/${shot.id}`}>
                  ライティング編集
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "comments" ? (
        <section className="panel space-y-4 p-5">
          <h3 className="text-lg font-bold">プロジェクトコメント</h3>
          <div className="space-y-3">
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
              placeholder="コメントを書く"
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
            />
            <button className="btn-primary" type="button" onClick={postComment} disabled={saving}>
              送信
            </button>
          </div>
        </section>
      ) : null}

      {tab === "delivery" ? (
        <section className="panel p-5">
          <h3 className="text-lg font-bold">納品チェック</h3>
          <p className="muted mt-1 text-sm">
            ステータスを「共有済」にしたショットが納品候補です。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary text-sm" type="button" onClick={exportProjectPdf} disabled={saving}>
              {saving ? "生成中..." : "絵コンテPDFを生成"}
            </button>
            <button className="btn-outline text-sm" type="button" onClick={() => void loadDeliverables()}>
              納品物を更新
            </button>
          </div>

          <div className="mt-4 grid-cards">
            {allShots
              .filter((shot) => shot.status === "共有済")
              .map((shot) => (
                <div key={shot.id} className="rounded-lg border border-[var(--border)] bg-white p-3">
                  <p className="font-semibold">{shot.title}</p>
                  <Link className="link text-sm" href={`/projects/${props.projectId}/shots/${shot.id}`}>
                    ショット詳細へ
                  </Link>
                </div>
              ))}
          </div>
          {allShots.every((shot) => shot.status !== "共有済") ? (
            <p className="muted mt-3 text-sm">共有済ショットはまだありません。</p>
          ) : null}

          <div className="mt-6 space-y-2">
            <h4 className="text-base font-bold">出力済み納品物</h4>
            {deliverables.map((deliverable) => (
              <article
                key={deliverable.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-white p-3"
              >
                <div>
                  <p className="font-semibold">{deliverable.drive_file_name}</p>
                  <p className="muted text-xs">
                    {deliverable.kind} / {new Date(deliverable.created_at).toLocaleString()}
                  </p>
                </div>
                {deliverable.drive_web_view_link ? (
                  <a className="btn-outline text-sm" href={deliverable.drive_web_view_link} target="_blank" rel="noreferrer">
                    Driveで開く
                  </a>
                ) : null}
              </article>
            ))}
            {deliverables.length === 0 ? (
              <p className="muted text-sm">まだ納品物はありません。</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SceneCard(props: {
  scene: Scene;
  saving: boolean;
  onAddShot: (sceneId: string, title: string) => Promise<void>;
  onMoveShot: (scene: Scene, index: number, direction: -1 | 1) => Promise<void>;
  onUpdateShotStatus: (shotId: string, status: string) => Promise<void>;
}) {
  const [newShotTitle, setNewShotTitle] = useState("");

  return (
    <section className="panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{props.scene.title}</h3>
        <span className="muted text-xs">シーン内ショット: {(props.scene.shots ?? []).length}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="input max-w-sm"
          placeholder="ショット名を追加"
          value={newShotTitle}
          onChange={(event) => setNewShotTitle(event.target.value)}
        />
        <button
          className="btn-primary"
          type="button"
          disabled={props.saving}
          onClick={async () => {
            await props.onAddShot(props.scene.id, newShotTitle);
            setNewShotTitle("");
          }}
        >
          ショット追加
        </button>
      </div>

      <div className="space-y-2">
        {(props.scene.shots ?? []).map((shot, index) => (
          <div
            key={shot.id}
            className="grid gap-2 rounded-lg border border-[var(--border)] bg-white p-3 md:grid-cols-[1fr_auto_auto_auto]"
          >
            <div>
              <Link className="link font-semibold" href={`/projects/${shot.project_id}/shots/${shot.id}`}>
                {shot.title}
              </Link>
              <p className="muted mt-1 text-xs">{shot.composition_memo || "構図メモなし"}</p>
            </div>
            <select
              className={`select min-w-[110px] status-${shot.status}`}
              value={shot.status}
              onChange={(event) => props.onUpdateShotStatus(shot.id, event.target.value)}
            >
              {SHOT_STATUSES.map((status) => (
                <option value={status} key={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              className="btn-outline text-sm"
              type="button"
              onClick={() => props.onMoveShot(props.scene, index, -1)}
            >
              ↑
            </button>
            <button
              className="btn-outline text-sm"
              type="button"
              onClick={() => props.onMoveShot(props.scene, index, 1)}
            >
              ↓
            </button>
          </div>
        ))}
        {(props.scene.shots ?? []).length === 0 ? (
          <p className="muted text-sm">ショットがまだありません。</p>
        ) : null}
      </div>
    </section>
  );
}
