import Link from "next/link";
import { Icon } from "@/components/icon";

type GamePaginationProps = {
  currentPage: number;
  pageCount: number;
  hrefForPage: (page: number) => string;
  ariaLabel?: string;
};

export const GAME_PAGE_SIZE = 24;

export function GamePagination({ currentPage, pageCount, hrefForPage, ariaLabel = "游戏列表分页" }: GamePaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className="game-pagination" aria-label={ariaLabel}>
      {currentPage > 1 ? (
        <Link className="game-pagination__arrow" href={hrefForPage(currentPage - 1)} aria-label="上一页">
          <Icon name="arrow-right" size={16} className="game-pagination__previous" />
        </Link>
      ) : (
        <span className="game-pagination__arrow is-disabled" aria-disabled="true" aria-label="上一页">
          <Icon name="arrow-right" size={16} className="game-pagination__previous" />
        </span>
      )}
      <div className="game-pagination__pages">
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
          <Link className={page === currentPage ? "is-active" : ""} aria-current={page === currentPage ? "page" : undefined} href={hrefForPage(page)} key={page}>{page}</Link>
        ))}
      </div>
      {currentPage < pageCount ? (
        <Link className="game-pagination__arrow" href={hrefForPage(currentPage + 1)} aria-label="下一页">
          <Icon name="arrow-right" size={16} />
        </Link>
      ) : (
        <span className="game-pagination__arrow is-disabled" aria-disabled="true" aria-label="下一页">
          <Icon name="arrow-right" size={16} />
        </span>
      )}
    </nav>
  );
}
