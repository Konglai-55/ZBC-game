import type { SVGProps } from "react";

export type IconName =
  | "arrow-right"
  | "book"
  | "calendar"
  | "check"
  | "chevron-down"
  | "cloud"
  | "copy"
  | "cpu"
  | "download"
  | "external"
  | "eye"
  | "gamepad"
  | "grid"
  | "hard-drive"
  | "help"
  | "home"
  | "menu"
  | "message"
  | "monitor"
  | "refresh"
  | "search"
  | "send"
  | "shield"
  | "smartphone"
  | "sparkles"
  | "star"
  | "tag"
  | "trending"
  | "upload"
  | "warning"
  | "wrench"
  | "x"
  | "zap";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 20, ...props }: IconProps) {
  const paths: Record<IconName, React.ReactNode> = {
    "arrow-right": <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></>,
    calendar: <><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    "chevron-down": <path d="m6 9 6 6 6-6"/>,
    cloud: <path d="M17.5 19H7a5 5 0 1 1 4.7-6.7A6 6 0 1 1 17.5 19Z"/>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    cpu: <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    external: <><path d="M15 3h6v6"/><path d="m10 14 11-11"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    gamepad: <><path d="M6 11h4M8 9v4"/><path d="M15 12h.01M18 10h.01"/><path d="M5.2 6h13.6a4 4 0 0 1 3.8 5.2l-1.8 5.5a2.7 2.7 0 0 1-4.5 1l-1.2-1.3H8.9l-1.2 1.3a2.7 2.7 0 0 1-4.5-1l-1.8-5.5A4 4 0 0 1 5.2 6Z"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    "hard-drive": <><path d="M22 12H2"/><path d="m5.5 4-3.3 8.5A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.9-7.5L18.5 4a2 2 0 0 0-1.9-1.3H7.4A2 2 0 0 0 5.5 4Z"/><circle cx="18" cy="16" r="1"/></>,
    help: <><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4"/><path d="M12 18h.01"/></>,
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/>,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    refresh: <><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8M5.5 15A7 7 0 0 0 17.8 17.8L20 16"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    smartphone: <><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></>,
    sparkles: <><path d="m12 3-1.2 3.8L7 8l3.8 1.2L12 13l1.2-3.8L17 8l-3.8-1.2Z"/><path d="m5 14-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8Z"/><path d="m19 14-.6 1.4L17 16l1.4.6L19 18l.6-1.4L21 16l-1.4-.6Z"/></>,
    star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1Z"/>,
    tag: <><path d="M20.6 13.6 11 4H4v7l9.6 9.6a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8Z"/><circle cx="7.5" cy="7.5" r=".5"/></>,
    trending: <><path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></>,
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></>,
    warning: <><path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4M12 17h.01"/></>,
    wrench: <path d="M14.7 6.3a4 4 0 0 0-5-5L7.6 3.4 10.6 6.4l-4.2 4.2-2-2L2 11v4l7 7 2.4-2.4-2-2 4.2-4.2 3 3 2.1-2.1a4 4 0 0 0-4-5Z"/>,
    x: <><path d="M18 6 6 18M6 6l12 12"/></>,
    zap: <path d="M13 2 3 14h9l-1 8 10-12h-9Z"/>,
  };

  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
