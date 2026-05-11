import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackingHub",
  description: "内部多项目埋点治理与产品分析平台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
