export function getVisiblePages(currentPage: number, pageCount: number) {
  const count = Math.min(10, pageCount);
  const start = Math.max(1, Math.min(currentPage - 4, pageCount - count + 1));
  return Array.from({ length: count }, (_, index) => start + index);
}
