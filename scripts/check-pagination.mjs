import assert from "node:assert/strict";
import { getVisiblePages } from "../lib/pagination.ts";

assert.deepEqual(getVisiblePages(1, 35), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.deepEqual(getVisiblePages(18, 35), [14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
assert.deepEqual(getVisiblePages(35, 35), [26, 27, 28, 29, 30, 31, 32, 33, 34, 35]);
assert.deepEqual(getVisiblePages(1, 0), []);
for (const total of [1, 2, 9, 10, 11, 35, 1000]) {
  for (let current = 1; current <= total; current++) {
    const pages = getVisiblePages(current, total);
    assert.equal(pages.length, Math.min(10, total));
    assert.ok(pages.includes(current));
    assert.ok(pages[0] >= 1 && pages.at(-1) <= total);
    assert.ok(pages.every((page, index) => index === 0 || page === pages[index - 1] + 1));
  }
}
console.log("PASS pagination: at most 10 consecutive page numbers, active page, first/middle/last and small totals");
