import { notFound, redirect } from "next/navigation";
import { ProjectWorkspace } from "@/components/project-workspace";
import { TopNav } from "@/components/top-nav";
import { ensureProfileForUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectDetailById, getProjectMembers } from "@/lib/server-data";
import type { ProjectMember } from "@/types/app";

export const dynamic = "force-dynamic";

function buildMemberSummary(members: ProjectMember[]): string {
  if (members.length === 0) {
    return "参加メンバー情報なし";
  }

  const owner =
    members.find((member) => member.role === "owner") ?? members[0];
  const hostName =
    owner.profile?.display_name?.trim() ||
    owner.profile?.email ||
    "ホスト";
  const othersCount = Math.max(members.length - 1, 0);

  if (othersCount === 0) {
    return `${hostName}さん`;
  }
  return `${hostName}さんと他${othersCount}名...`;
}

export default async function ProjectDetailPage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const params = await props.params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  let loadError: string | null = null;
  let detail: Awaited<ReturnType<typeof getProjectDetailById>> | null = null;
  let canIssueInviteLink = false;
  let memberSummary = "参加メンバー情報なし";

  try {
    await ensureProfileForUser(supabase, user);
    detail = await getProjectDetailById(supabase, params.projectId);
    if (detail) {
      const members = await getProjectMembers(supabase, params.projectId);
      canIssueInviteLink = members.some(
        (member) => member.user_id === user.id && member.role === "owner",
      );
      memberSummary = buildMemberSummary(members);
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unknown error while loading project.";
  }

  if (loadError) {
    return (
      <main className="page">
        <TopNav title="プロジェクト詳細" subtitle="読み込みエラー" user={user} />
        <section className="panel p-6">
          <h2 className="text-lg font-bold">プロジェクト詳細の読み込みに失敗しました</h2>
          <p className="mt-2 text-sm text-[var(--danger)]">{loadError}</p>
          <p className="muted mt-2 text-sm">
            Supabaseで `/Users/ryo1280/codex/coscon/docs/supabase_schema.sql`
            を再適用して再度ログインしてください。
          </p>
        </section>
      </main>
    );
  }

  if (!detail) {
    notFound();
  }

  return (
    <main className="page">
      <TopNav user={user} />
      <ProjectWorkspace
        projectId={params.projectId}
        initialData={detail}
        canIssueInviteLink={canIssueInviteLink}
        memberSummary={memberSummary}
      />
    </main>
  );
}
