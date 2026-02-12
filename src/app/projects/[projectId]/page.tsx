import { notFound, redirect } from "next/navigation";
import { ProjectWorkspace } from "@/components/project-workspace";
import { TopNav } from "@/components/top-nav";
import { ensureProfileForUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectDetailById, getProjectMembers } from "@/lib/server-data";

export const dynamic = "force-dynamic";

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

  try {
    await ensureProfileForUser(supabase, user);
    detail = await getProjectDetailById(supabase, params.projectId);
    if (detail) {
      const members = await getProjectMembers(supabase, params.projectId);
      canIssueInviteLink = members.some(
        (member) => member.user_id === user.id && member.role === "owner",
      );
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
      />
    </main>
  );
}
