import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function PrivacyPage() {
  return (
    <main className="page">
      <section className="panel mx-auto max-w-3xl space-y-6 p-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">{APP_NAME} プライバシーポリシー</h1>
          <p className="muted text-sm">最終更新日: 2026年2月12日</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">1. 取得する情報</h2>
          <p className="text-sm">
            当サービスは、Googleログイン時にユーザー識別情報（メールアドレス、表示名、プロフィール画像）を取得します。
            また、サービス機能の提供に必要な範囲で、Google Drive上の当サービス作成ファイル情報を取り扱います。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">2. 利用目的</h2>
          <p className="text-sm">
            取得した情報は、本人確認、プロジェクト共有、アプリ機能の提供、サポート対応のために利用します。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">3. 第三者提供</h2>
          <p className="text-sm">
            法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">4. 保存期間</h2>
          <p className="text-sm">
            アカウント情報およびプロジェクト情報は、サービス提供に必要な期間保存されます。削除依頼があった場合は、合理的な範囲で対応します。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">5. お問い合わせ</h2>
          <p className="text-sm">
            本ポリシーに関するお問い合わせは、運営者が指定する連絡先までお願いします。
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
