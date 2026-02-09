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
  await ensureProfileForUser(supabase, user);

  const detail = await getProjectDetailById(supabase, params.projectId);
  if (!detail) {
    notFound();
  }
  const [comments, members, deliverables] = await Promise.all([
    getProjectComments(supabase, params.projectId),
    getProjectMembers(supabase, params.projectId),
    getProjectDeliverables(supabase, params.projectId),
  ]);

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
