"use client";

import Link from "next/link";
import { useState } from "react";
import { SHOT_STATUSES } from "@/lib/constants";
import type { ProjectDetail, Scene } from "@/types/app";

export function ProjectWorkspace(props: {
  projectId: string;
  initialData: ProjectDetail;
  canIssueInviteLink: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [data, setData] = useState<ProjectDetail>(props.initialData);
  const [newCharacterTitle, setNewCharacterTitle] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteWarning, setInviteWarning] = useState("");
  const [issuingInviteLink, setIssuingInviteLink] = useState(false);

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

  async function addCharacter() {
    if (!newCharacterTitle.trim()) {
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/projects/${props.projectId}/scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newCharacterTitle.trim() }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "キャラ追加に失敗しました。");
      return;
    }
    setNewCharacterTitle("");
    await loadProject();
  }

  async function addShot(sceneId: string, title: string) {
    if (!title.trim()) {
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
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
    setError(null);
    setNotice(null);
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
    if (target < 0 || target >= shots.length) {
      return;
    }
    const tmp = shots[index];
    shots[index] = shots[target];
    shots[target] = tmp;

    setSaving(true);
    setError(null);
    setNotice(null);
    const response = await fetch("/api/shots/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: shots.map((shot, order) => ({
          id: shot.id,
          sortOrder: order,
        })),
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "並び替えに失敗しました。");
      return;
    }
    await loadProject();
  }

  async function issueInviteLink() {
    setIssuingInviteLink(true);
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/projects/${props.projectId}/invite-link`, {
      method: "POST",
    });
    const body = (await response.json().catch(() => ({}))) as {
      data?: { inviteUrl?: string; warning?: string };
      error?: string;
    };
    setIssuingInviteLink(false);
    if (!response.ok || !body.data?.inviteUrl) {
      setError(body.error ?? "招待リンクの発行に失敗しました。");
      return;
    }
    setInviteLink(body.data.inviteUrl);
    setInviteWarning(body.data.warning ?? "");
    setNotice("招待リンクを発行しました。");
  }

  async function copyInviteLink() {
    if (!inviteLink) {
      return;
    }
    setError(null);
    try {
      await navigator.clipboard.writeText(inviteLink);
      setNotice("招待リンクをコピーしました。");
    } catch {
      setError("クリップボードへのコピーに失敗しました。");
    }
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
              <a
                className="btn-outline text-sm"
                href={data.project.drive_folder_url}
                target="_blank"
                rel="noreferrer"
              >
                Driveフォルダを開く
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {props.canIssueInviteLink ? (
        <section className="panel space-y-3 p-5">
          <h3 className="text-lg font-bold">招待リンク発行</h3>
          <p className="text-sm text-[var(--danger)]">
            このリンクを知っている人は誰でもプロジェクト参加とDriveフォルダ編集が可能です。
          </p>
          <p className="text-sm text-[var(--danger)]">
            リンクを再発行すると、旧リンクは無効になります。
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-primary" type="button" onClick={issueInviteLink} disabled={issuingInviteLink}>
              {issuingInviteLink ? "発行中..." : inviteLink ? "リンクを再発行" : "リンクを発行"}
            </button>
            <button className="btn-outline text-sm" type="button" onClick={copyInviteLink} disabled={!inviteLink}>
              コピー
            </button>
          </div>
          <input
            className="input"
            readOnly
            value={inviteLink}
            placeholder="まだ招待リンクは発行されていません。"
          />
          {inviteWarning ? <p className="muted text-xs">{inviteWarning}</p> : null}
        </section>
      ) : null}

      {notice ? <p className="text-sm text-[var(--success)]">{notice}</p> : null}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <section className="panel flex flex-wrap items-center gap-2 p-4">
        <input
          className="input max-w-sm"
          placeholder="新しいキャラ名"
          value={newCharacterTitle}
          onChange={(event) => setNewCharacterTitle(event.target.value)}
        />
        <button className="btn-primary" type="button" onClick={addCharacter} disabled={saving}>
          キャラ追加
        </button>
      </section>

      <section className="space-y-4">
        {data.scenes.map((scene) => (
          <CharacterCard
            key={scene.id}
            scene={scene}
            saving={saving}
            onAddShot={addShot}
            onMoveShot={moveShot}
            onUpdateShotStatus={updateShotStatus}
          />
        ))}
        {data.scenes.length === 0 ? (
          <section className="panel p-5">
            <p className="muted text-sm">キャラがまだありません。</p>
          </section>
        ) : null}
      </section>
    </div>
  );
}

function CharacterCard(props: {
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
        <span className="muted text-xs">キャラ内ショット: {(props.scene.shots ?? []).length}</span>
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
