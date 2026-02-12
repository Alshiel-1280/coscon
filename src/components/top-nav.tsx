import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function TopNav(props: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="muted mb-1 text-sm">{APP_NAME}</p>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">{props.title}</h1>
        {props.subtitle ? <p className="muted mt-1 text-sm">{props.subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <Link className="btn-outline text-sm" href="/projects">
          プロジェクト一覧
        </Link>
        {props.rightSlot}
        <a className="btn-outline text-sm" href="/auth/logout">
          ログアウト
        </a>
      </div>
    </header>
  );
}
