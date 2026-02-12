import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_NAME} | Cosplay storyboard app`,
  verification: {
    google: "Uf6VlOuLG1tF3zLo8T90J3pX-thFy4k9fcuvX8QRY30",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <div className="app-background">{children}</div>
      </body>
    </html>
  );
}
