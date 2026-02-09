import Link from "next/link";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { ensureProfileForUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProjectsForUser } from "@/lib/server-data";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  await ensureProfileForUser(supabase, user);
  const projects = await getProjectsForUser(supabase);

  return (
    <main className="page">
      <TopNav
        title="プロジェクト一覧"
        subtitle="コスプレ撮影ごとに絵コンテとライティングを管理"
        rightSlot={
          <Link className="btn-primary text-sm" href="/projects/new">
            新規作成
          </Link>
        }
      />

      <section className="grid-cards">
        {projects.map((project) => (
          <article key={project.id} className="panel space-y-3 p-4">
            <div>
              <h2 className="text-lg font-bold">{project.title}</h2>
              <p className="muted text-sm">
                撮影日: {project.shoot_date ?? "-"} / 場所: {project.location ?? "-"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="badge">{project.status}</span>
              <Link className="link text-sm" href={`/projects/${project.id}`}>
                開く
              </Link>
            </div>
          </article>
        ))}
        {projects.length === 0 ? (
          <article className="panel p-6">
            <h2 className="text-lg font-bold">まだプロジェクトがありません</h2>
            <p className="muted mt-2 text-sm">新規作成から撮影プロジェクトを登録してください。</p>
          </article>
        ) : null}
      </section>
    </main>
  );
}
