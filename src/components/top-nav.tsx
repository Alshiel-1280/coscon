import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function TopNav(props: {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  user?: User | null;
}) {
  const userMetadata = props.user?.user_metadata ?? {};
  const displayName =
    (typeof userMetadata.full_name === "string" && userMetadata.full_name) ||
    (typeof userMetadata.name === "string" && userMetadata.name) ||
    props.user?.email ||
    "アカウント";
  const avatarUrl =
    typeof userMetadata.avatar_url === "string" ? userMetadata.avatar_url : null;
  const fallbackInitial = displayName.slice(0, 1).toUpperCase();

  return (
    <header className="app-nav mb-6">
      <div>
        <Link className="app-nav-brand" href="/projects">
          {APP_NAME}
        </Link>
        {props.title ? (
          <h1 className="mt-2 text-2xl font-bold text-[var(--text-main)]">{props.title}</h1>
        ) : null}
        {props.subtitle ? <p className="muted mt-1 text-sm">{props.subtitle}</p> : null}
      </div>
      <div className="flex items-start gap-2">
        {props.rightSlot}
        <details className="account-menu">
          <summary className="account-trigger" aria-label="アカウントメニューを開く">
            {avatarUrl ? (
              // External Google avatars are rendered as-is to avoid strict host config coupling.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="account-avatar-image" src={avatarUrl} alt={displayName} />
            ) : (
              <span className="account-avatar-fallback">{fallbackInitial}</span>
            )}
          </summary>
          <div className="account-dropdown panel">
            <p className="text-sm font-semibold">{displayName}</p>
            {props.user?.email ? <p className="muted mt-1 text-xs">{props.user.email}</p> : null}
            <div className="mt-3 flex flex-col gap-2">
              <Link className="btn-outline text-center text-sm" href="/projects">
                プロジェクト一覧に戻る
              </Link>
              <a className="btn-outline text-center text-sm" href="/auth/logout">
                ログアウト
              </a>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
