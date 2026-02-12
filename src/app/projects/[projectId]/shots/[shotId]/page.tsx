import { notFound, redirect } from "next/navigation";
import { ShotDetailWorkspace } from "@/components/shot-detail-workspace";
import { TopNav } from "@/components/top-nav";
import { ensureProfileForUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getShotComments, getShotWorkspace } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function ShotDetailPage(props: {
  params: Promise<{ projectId: string; shotId: string }>;
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
  let workspace: Awaited<ReturnType<typeof getShotWorkspace>> | null = null;
  let comments: Awaited<ReturnType<typeof getShotComments>> = [];

  try {
    await ensureProfileForUser(supabase, user);
    workspace = await getShotWorkspace(supabase, params.shotId);
    if (workspace && workspace.project.id === params.projectId) {
      comments = await getShotComments(supabase, params.shotId);
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Unknown error while loading shot.";
  }

  if (loadError) {
    return (
      <main className="page">
        <TopNav title="ショット詳細" subtitle="読み込みエラー" user={user} />
        <section className="panel p-6">
          <h2 className="text-lg font-bold">ショット詳細の読み込みに失敗しました</h2>
          <p className="mt-2 text-sm text-[var(--danger)]">{loadError}</p>
        </section>
      </main>
    );
  }

  if (!workspace || workspace.project.id !== params.projectId) {
    notFound();
  }

  return (
    <main className="page">
      <TopNav
        title={`ショット詳細: ${workspace.shot.title}`}
        subtitle={workspace.project.title}
        user={user}
      />
      <ShotDetailWorkspace
        projectId={workspace.project.id}
        projectTitle={workspace.project.title}
        scenes={workspace.scenes}
        initialShot={workspace.shot}
        initialAssets={workspace.assets}
        initialLighting={workspace.lighting}
        initialComments={comments}
      />
    </main>
  );
}
