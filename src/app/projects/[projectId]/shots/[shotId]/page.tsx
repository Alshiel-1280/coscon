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
  await ensureProfileForUser(supabase, user);

  const workspace = await getShotWorkspace(supabase, params.shotId);
  if (!workspace || workspace.project.id !== params.projectId) {
    notFound();
  }
  const comments = await getShotComments(supabase, params.shotId);

  return (
    <main className="page">
      <TopNav
        title={`ショット詳細: ${workspace.shot.title}`}
        subtitle={workspace.project.title}
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
