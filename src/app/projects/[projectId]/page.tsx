import { notFound, redirect } from "next/navigation";
import { ProjectWorkspace } from "@/components/project-workspace";
import { TopNav } from "@/components/top-nav";
import { ensureProfileForUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getProjectComments,
  getProjectDeliverables,
  getProjectDetailById,
  getProjectMembers,
} from "@/lib/server-data";
import type { ProjectTabKey } from "@/types/app";

export const dynamic = "force-dynamic";

function resolveTab(
  tab: string | string[] | undefined,
): ProjectTabKey {
  const first = Array.isArray(tab) ? tab[0] : tab;
  if (
    first === "storyboard" ||
    first === "lighting" ||
    first === "comments" ||
    first === "delivery"
  ) {
    return first;
  }
  return "storyboard";
}

export default async function ProjectDetailPage(props: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  let loadError: string | null = null;
  let detail: Awaited<ReturnType<typeof getProjectDetailById>> | null = null;
  let comments: Awaited<ReturnType<typeof getProjectComments>> = [];
  let members: Awaited<ReturnType<typeof getProjectMembers>> = [];
  let deliverables: Awaited<ReturnType<typeof getProjectDeliverables>> = [];

  try {
    await ensureProfileForUser(supabase, user);
    detail = await getProjectDetailById(supabase, params.projectId);
    if (detail) {
      [comments, members, deliverables] = await Promise.all([
        getProjectComments(supabase, params.projectId),
        getProjectMembers(supabase, params.projectId),
        getProjectDeliverables(supabase, params.projectId),
      ]);
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unknown error while loading project.";
  }

  if (loadError) {
    return (
      <main className="page">
        <TopNav title="プロジェクト詳細" subtitle="読み込みエラー" />
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
      <TopNav title={detail.project.title} subtitle="絵コンテ / ライティング / コメント / 納品" />
      <ProjectWorkspace
        projectId={params.projectId}
        initialTab={resolveTab(searchParams.tab)}
        initialData={detail}
        initialComments={comments}
        initialMembers={members}
        initialDeliverables={deliverables}
      />
    </main>
  );
}
