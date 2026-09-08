import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/legal-document";
import { getSiteSettings, listLegalDocuments } from "@/lib/content-store";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const document = (await listLegalDocuments()).find((item) => item.id === "infringement");
  return { title: document?.title || "侵权处理", description: document?.description };
}

export default async function InfringementPage() {
  const [documents, settings] = await Promise.all([listLegalDocuments(), getSiteSettings()]);
  const document = documents.find((item) => item.id === "infringement");
  if (!document?.published) notFound();
  return <LegalDocument document={document} documents={documents} settings={settings} />;
}
