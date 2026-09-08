import Link from "next/link";

export type SortMode = "latest" | "hot" | "update";

export function SortToggle({ latestHref, hotHref, updateHref, active = "latest" }: { latestHref: string; hotHref: string; updateHref?: string; active?: SortMode }) {
  return (
    <nav className="sort-toggle" aria-label="内容排序">
      <Link aria-current={active === "latest" ? "page" : undefined} className={active === "latest" ? "is-active" : ""} href={latestHref}>最新</Link>
      <Link aria-current={active === "hot" ? "page" : undefined} className={active === "hot" ? "is-active" : ""} href={hotHref}>热门</Link>
      {updateHref && <Link aria-current={active === "update" ? "page" : undefined} className={active === "update" ? "is-active" : ""} href={updateHref}>更新</Link>}
    </nav>
  );
}
