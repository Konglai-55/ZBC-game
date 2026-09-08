import Image from "next/image";
import type { Game } from "@/lib/types";
import { mediaUrl } from "@/lib/media-url";

type GameArtworkProps = {
  game: Game;
  variant?: "card" | "hero" | "compact";
  className?: string;
};

export function GameArtwork({ game, variant = "card", className = "" }: GameArtworkProps) {
  return (
    <div className={`game-art game-art--${variant} ${className}`}>
      <Image
        alt={`${game.title} 游戏宣传图`}
        fill
        priority={variant === "hero"}
        sizes={variant === "hero" ? "(max-width: 820px) 100vw, 58vw" : variant === "compact" ? "140px" : "(max-width: 620px) 50vw, 280px"}
        src={mediaUrl(game.cover || `/covers/${game.slug}.jpg`)}
      />
    </div>
  );
}
