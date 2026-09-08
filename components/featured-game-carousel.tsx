"use client";

import Link from "next/link";
import { useState } from "react";
import { GameArtwork } from "@/components/game-artwork";
import { Icon } from "@/components/icon";
import { formatViews } from "@/lib/data";
import type { Game } from "@/lib/types";

export function FeaturedGameCarousel({ games }: { games: Game[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeGame = games[activeIndex];

  if (!activeGame) return null;

  const goToPrevious = () => setActiveIndex((current) => (current - 1 + games.length) % games.length);
  const goToNext = () => setActiveIndex((current) => (current + 1) % games.length);

  return (
    <div className="featured-carousel" aria-label="热门游戏推荐">
      <div className="featured-carousel__toolbar">
        <span><Icon name="trending" size={18} />热门推荐</span>
        <div className="featured-carousel__controls">
          <button aria-label="上一款热门游戏" disabled={games.length < 2} onClick={goToPrevious} type="button">
            <Icon className="featured-carousel__previous" name="arrow-right" size={18} />
          </button>
          <strong aria-live="polite">{activeIndex + 1}<small> / {games.length}</small></strong>
          <button aria-label="下一款热门游戏" disabled={games.length < 2} onClick={goToNext} type="button">
            <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </div>

      <article className="featured-showcase" key={activeGame.slug}>
        <GameArtwork game={activeGame} variant="hero" />
        <div className="featured-showcase__shade" />
        <div className="featured-showcase__badges">
          <span>{activeGame.category}</span><span>{activeGame.badge}</span>
        </div>
        <div className="featured-showcase__content">
          <small>{activeGame.englishTitle}</small>
          <h2>{activeGame.title}</h2>
          <p>{activeGame.tagline}</p>
          <div className="featured-showcase__meta">
            <span><Icon name="star" size={16} />{activeGame.score}</span>
            <span><Icon name="eye" size={16} />{formatViews(activeGame.views)}</span>
            <span><Icon name="hard-drive" size={16} />{activeGame.size}</span>
          </div>
          <Link className="featured-showcase__cta" href={`/games/${activeGame.slug}`}>查看游戏详情 <Icon name="arrow-right" size={18} /></Link>
        </div>
      </article>

      {games.length > 1 && (
        <div className="featured-carousel__dots" aria-label="选择热门游戏" role="group">
          {games.map((game, index) => (
            <button
              aria-label={`查看第 ${index + 1} 款：${game.title}`}
              aria-pressed={index === activeIndex}
              className={index === activeIndex ? "is-active" : ""}
              key={game.slug}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
}
