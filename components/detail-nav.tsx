import { Icon } from "@/components/icon";

export function DetailNav({ hasRequirements }: { hasRequirements: boolean }) {
  return (
    <nav className="detail-nav" aria-label="本页导航">
      <span>本页导航</span>
      <a href="#introduction"><Icon name="book" size={17} />游戏介绍</a>
      {hasRequirements && <a href="#requirements"><Icon name="cpu" size={17} />系统配置</a>}
      <a href="#downloads"><Icon name="download" size={17} />资源下载</a>
    </nav>
  );
}
