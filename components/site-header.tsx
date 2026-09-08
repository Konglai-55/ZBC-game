"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { navItems } from "@/lib/data";
import { Icon, type IconName } from "@/components/icon";
import type { SiteSettings } from "@/lib/types";

const navIcons: Record<string, IconName> = {
  "/": "home",
  "/category/pc": "monitor",
  "/category/switch": "gamepad",
  "/category/mobile": "smartphone",
  "/category/ps5": "gamepad",
  "/category/ps4": "gamepad",
  "/category/other": "grid",
  "/resources?type=mod": "sparkles",
  "/resources?type=tools": "wrench",
  "/help": "help",
};

function isNavItemActive(href: string, pathname: string, searchParams: URLSearchParams) {
  const [path, query] = href.split("?");
  if (path === "/") return pathname === "/";
  if (!(pathname === path || pathname.startsWith(`${path}/`))) return false;
  if (!query) return true;
  const expected = new URLSearchParams(query);
  return Array.from(expected.entries()).every(([key, value]) => searchParams.get(key) === value);
}

function NavigationItems({ pathname, searchParams, mobile, onNavigate }: { pathname: string; searchParams: URLSearchParams; mobile?: boolean; onNavigate?: () => void }) {
  return <>{navItems.map((item) => {
    const active = isNavItemActive(item.href, pathname, searchParams);
    if (mobile) return <Link aria-current={active ? "page" : undefined} className={active ? "is-active" : ""} href={item.href} key={item.href} onClick={onNavigate}><span className="mobile-nav__label"><Icon name={navIcons[item.href] || "grid"} size={16} /><span>{item.label}</span></span><Icon className="mobile-nav__arrow" name="arrow-right" size={16} /></Link>;
    return <Link aria-current={active ? "page" : undefined} className={active ? "is-active" : ""} href={item.href} key={item.href}><Icon className="desktop-nav__icon" name={navIcons[item.href] || "grid"} size={16} /><span>{item.label}</span></Link>;
  })}</>;
}

function QueryAwareNavigation({ pathname, mobile, onNavigate }: { pathname: string; mobile?: boolean; onNavigate?: () => void }) {
  const searchParams = useSearchParams();
  return <NavigationItems pathname={pathname} searchParams={searchParams} mobile={mobile} onNavigate={onNavigate} />;
}

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header__inner shell">
        <Link className="brand" href="/" onClick={() => setOpen(false)} aria-label={`${settings.siteName} 首页`}>
          <BrandLogo priority />
        </Link>
        <nav className="desktop-nav" aria-label="主导航">
          <Suspense fallback={<NavigationItems pathname={pathname} searchParams={new URLSearchParams()} />}>
            <QueryAwareNavigation pathname={pathname} />
          </Suspense>
        </nav>
        <div className="header-actions">
          <Link className="icon-button" href="/search" aria-label="搜索游戏"><Icon name="search" /></Link>
          <button aria-controls="mobile-navigation" className="mobile-menu-button" type="button" aria-label={open ? "关闭游戏导航" : "查看更多游戏"} aria-expanded={open} onClick={() => setOpen(!open)}>
            <span className="mobile-menu-button__text">{open ? "收起游戏导航" : "点击查看更多游戏"}</span>
            <span className="mobile-menu-button__icon" aria-hidden="true"><Icon name={open ? "x" : "menu"} /></span>
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-nav shell is-open" id="mobile-navigation" aria-label="移动端主导航">
          <Suspense fallback={<NavigationItems pathname={pathname} searchParams={new URLSearchParams()} mobile onNavigate={() => setOpen(false)} />}>
            <QueryAwareNavigation pathname={pathname} mobile onNavigate={() => setOpen(false)} />
          </Suspense>
        </nav>
      )}
    </header>
  );
}
