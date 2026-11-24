"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { activityDate, normalizeSearchTerm, type ActivityEvent } from "@/lib/activity-events";

let pending = Promise.resolve();
let checkedDay = "";

export function reportActivity(event: ActivityEvent) {
  if (navigator.doNotTrack === "1" ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  const body = JSON.stringify(event);
  pending = pending.then(async () => {
    await fetch("/api/site-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      keepalive: true,
      body,
      signal: AbortSignal.timeout(4000),
    });
  }).catch(() => {});
}

export function SiteActivity({ pathname }: { pathname: string }) {
  useEffect(() => {
    function reportVisit() {
      if (document.visibilityState !== "visible") return;
      const date = activityDate.format(new Date());
      if (date === checkedDay) return;
      checkedDay = date;
      reportActivity({ type: "visit" });
    }
    reportVisit();
    document.addEventListener("visibilitychange", reportVisit);
    return () => document.removeEventListener("visibilitychange", reportVisit);
  }, [pathname]);
  return null;
}

export function SearchActivity({ query, noResults }: { query: string; noResults: boolean }) {
  const previous = useRef("");
  useEffect(() => {
    const term = normalizeSearchTerm(query);
    if (!term || term === previous.current) return;
    function reportSearch() {
      if (document.visibilityState !== "visible" || term === previous.current) return;
      previous.current = term;
      reportActivity({ type: "search", term, noResults });
    }
    reportSearch();
    document.addEventListener("visibilitychange", reportSearch);
    return () => document.removeEventListener("visibilitychange", reportSearch);
  }, [query, noResults]);
  return null;
}

export function ResourceDownloadLink({ resourceId, external, ...props }:
  Omit<ComponentProps<"a">, "onClick"> & { resourceId: string; external: boolean }) {
  return <a {...props} onClick={() => reportActivity({
    type: "download", kind: "resource", id: resourceId, provider: external ? "external" : "file",
  })} />;
}
