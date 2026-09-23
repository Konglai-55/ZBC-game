import Link from "next/link";
import { formatViews, getPlatform } from "@/lib/data";
import type { Game } from "@/lib/types";
import { GameArtwork } from "@/components/game-artwork";
import { Icon } from "@/components/icon";

export function GameCard({ game }: { game: Game }) {
  const platform = getPlatform(game.platform);
  return (
    <Link className="game-card" href={`/games/${game.slug}`} target="_blank" rel="noopener noreferrer">
      <div className="game-card__media">
        <GameArtwork game={game} />
        <div className="game-card__topline">
          <span className="tag tag--glass">{game.category}</span>
          <span className={`tag tag--${game.badge === "新游" ? "hot" : "cool"}`}>{platform?.shortLabel} · {game.badge}</span>
        </div>
      </div>
      <div className="game-card__body">
        <div className="game-card__platform">{platform?.shortLabel} · {game.genre}</div>
        <h3>{game.title}</h3>
        <p>{game.englishTitle}</p>
        <div className="game-card__meta">
          <span><Icon name="hard-drive" size={14} />{game.size}</span>
          <span><Icon name="calendar" size={14} />{game.updated.slice(5)}</span>
        </div>
      </div>
    </Link>
  );
}

export function RankedGame({ game, rank, mode = "ranking" }: { game: Game; rank: number; mode?: "ranking" | "updated" }) {
  return (
    <Link className="ranked-game" href={`/games/${game.slug}`} target="_blank" rel="noopener noreferrer">
      <div className="ranked-game__art">
        <GameArtwork game={game} variant="compact" />
        <span>{mode === "updated" ? `更新 ${rank}` : `TOP ${rank}`}</span>
      </div>
      <div>
        <strong>{game.title}</strong>
        <small>{mode === "updated" ? `${game.updated} 更新` : `${game.genre} · ${formatViews(game.views)} 阅读`}</small>
      </div>
    </Link>
  );
}
