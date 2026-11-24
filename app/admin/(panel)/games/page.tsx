import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GameManager } from "@/components/admin/game-manager";
import { listGames, listResources } from "@/lib/content-store";
import { resourceReferenceId } from "@/lib/data";
import { Icon } from "@/components/icon";

export default async function AdminGamesPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: newParam } = await searchParams;
  const [games, resources] = await Promise.all([listGames(), listResources()]);
  const choices = resources.filter(({ group }) => group !== "tools")
    .map((resource) => {
      const { id, name, group, version, published } = resource;
      return { id, name, group, version, published, referenceId: resourceReferenceId(resource) };
    });
  return <div className="admin-page"><AdminPageHeader eyebrow="CONTENT / GAMES" title="游戏管理" description="编辑游戏资料、封面、网盘线路和关联资源。" icon="gamepad" actions={<span className="admin-header-hint"><Icon name="shield" size={15} />保存后立即同步前台</span>} /><GameManager initialGames={games} resources={choices} initialCreate={newParam === "1"} /></div>;
}
