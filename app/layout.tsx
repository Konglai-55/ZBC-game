import type { Metadata, Viewport } from "next";
import "@/app/site.css";
import { SiteFrame } from "@/components/site-frame";
import { getSiteSettings, listLegalDocuments } from "@/lib/content-store";
import { mediaUrl } from "@/lib/media-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "ZBC Game - 发现值得玩的下一款游戏",
    template: "%s | ZBC Game",
  },
  description: "中文游戏资源门户，收录电脑、Switch、手机、PS5、PS4 游戏与实用工具。",
  icons: { icon: mediaUrl("/brand/icon.svg") },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, documents] = await Promise.all([getSiteSettings(), listLegalDocuments()]);
  return (
    <html data-scroll-behavior="smooth" lang="zh-CN">
      <body>
        <SiteFrame settings={settings} documents={documents}>{children}</SiteFrame>
      </body>
    </html>
  );
}
