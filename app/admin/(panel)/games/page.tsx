import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GameManager } from "@/components/admin/game-manager";
import { listGames } from "@/lib/content-store";
import { Icon } from "@/components/icon";

export default async function AdminGamesPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: newParam } = await searchParams;
  return <div className="admin-page"><AdminPageHeader eyebrow="CONTENT / GAMES" title="游戏管理" description="编辑游戏资料、封面、系统配置和三种网盘下载线路。" icon="gamepad" actions={<span className="admin-header-hint"><Icon name="shield" size={15} />保存后立即同步前台</span>} /><GameManager initialGames={await listGames()} initialCreate={newParam === "1"} /></div>;
}
