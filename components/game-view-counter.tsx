"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { formatViews } from "@/lib/data";

type ViewResponse = {
  data?: { views: number; counted: boolean };
};

export function GameViewCounter({ slug, initialViews }: { slug: string; initialViews: number }) {
  const [views, setViews] = useState(initialViews);
  const reportedSlug = useRef<string | null>(null);

  useEffect(() => {
    setViews(initialViews);
  }, [initialViews, slug]);

  useEffect(() => {
    let active = true;
    let retryTimer: number | undefined;

    async function reportVisibleView() {
      if (document.visibilityState !== "visible" || reportedSlug.current === slug) return;
      reportedSlug.current = slug;
      try {
        const response = await fetch(`/api/games/${encodeURIComponent(slug)}/view`, {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          keepalive: true,
        });
        const payload = await response.json() as ViewResponse;
        if (response.ok && payload.data && reportedSlug.current === slug) setViews(payload.data.views);
        if (!response.ok) throw new Error("view request failed");
      } catch {
        if (!active) return;
        reportedSlug.current = null;
        retryTimer = window.setTimeout(() => void reportVisibleView(), 5000);
      }
    }

    const onVisibilityChange = () => void reportVisibleView();
    document.addEventListener("visibilitychange", onVisibilityChange);
    void reportVisibleView();
    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [slug]);

  return <span aria-label={`${views.toLocaleString("zh-CN")} 次阅读`}><Icon name="eye" size={16} />{formatViews(views)} 阅读</span>;
}
