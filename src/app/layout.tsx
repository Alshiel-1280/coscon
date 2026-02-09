import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "撮影絵コンテアプリ",
  description: "Cosplay shooting storyboard app MVP",
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
