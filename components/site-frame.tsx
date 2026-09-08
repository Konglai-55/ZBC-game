"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { LegalDocumentItem, SiteSettings } from "@/lib/types";

export function SiteFrame({ children, settings, documents }: { children: React.ReactNode; settings: SiteSettings; documents: LegalDocumentItem[] }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;
  return (
    <>
      <a className="skip-link" href="#main-content">跳至主要内容</a>
      <SiteHeader settings={settings} />
      <main id="main-content">{children}</main>
      <SiteFooter settings={settings} documents={documents} />
    </>
  );
}
