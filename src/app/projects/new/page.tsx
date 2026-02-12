import { redirect } from "next/navigation";
import { ProjectCreateForm } from "@/components/project-create-form";
import { TopNav } from "@/components/top-nav";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProjectNewPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="page">
      <TopNav
        title="プロジェクト作成"
        subtitle="Driveフォルダを自動作成します"
        user={user}
      />
      <ProjectCreateForm />
    </main>
  );
}
