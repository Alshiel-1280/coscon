import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function TermsPage() {
  return (
    <main className="page">
      <section className="panel mx-auto max-w-3xl space-y-6 p-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">{APP_NAME} 利用規約</h1>
          <p className="muted text-sm">最終更新日: 2026年2月12日</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">1. 適用</h2>
          <p className="text-sm">
            本規約は、{APP_NAME}
            （以下「当サービス」）の利用条件を定めるものです。ユーザーは本規約に同意のうえ、当サービスを利用するものとします。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">2. アカウント</h2>
          <p className="text-sm">
            ユーザーは、Googleアカウントを用いてログインします。アカウント管理はユーザー自身の責任で行ってください。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">3. 禁止事項</h2>
          <p className="text-sm">
            法令違反行為、不正アクセス、他者の権利侵害、サービス運営を妨げる行為を禁止します。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">4. サービス変更・停止</h2>
          <p className="text-sm">
            当サービスは、メンテナンスや運営上の都合により、予告なく内容の変更または提供停止を行うことがあります。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">5. 免責</h2>
          <p className="text-sm">
            当サービスは、利用により生じた損害について、当サービスに故意または重大な過失がある場合を除き責任を負いません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">6. 規約の変更</h2>
          <p className="text-sm">
            当サービスは必要に応じて本規約を変更できます。変更後の規約は、当サービス上に表示した時点で効力を生じます。
          </p>
        </section>

        <div className="pt-2">
          <Link className="btn-outline text-sm" href="/login">
            ログイン画面に戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
