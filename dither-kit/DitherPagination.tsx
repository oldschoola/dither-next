import { useMemo } from "react";

import { cn } from "./lib";

/** Compact page list with ellipsis anchors — always shows first, last, the
 *  current page and `siblings` on each side, collapsing the rest to "…".
 *  Verbatim port of the `pageList` export in DitherPagination.vue. */
export function pageList(
  page: number,
  total: number,
  siblings = 1,
): (number | "…")[] {
  const range = (s: number, e: number) =>
    Array.from({ length: e - s + 1 }, (_, i) => s + i);
  const slots = siblings * 2 + 5;
  if (total <= slots) return range(1, total);
  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, total);
  const leftDots = left > 2;
  const rightDots = right < total - 1;
  if (!leftDots && rightDots)
    return [...range(1, 3 + siblings * 2), "…", total];
  if (leftDots && !rightDots)
    return [1, "…", ...range(total - (2 + siblings * 2), total)];
  return [1, "…", ...range(left, right), "…", total];
}

export interface DitherPaginationProps {
  page: number;
  total: number;
  siblings?: number;
  class?: string;
  onPageChange?: (page: number) => void;
}

const CELL_BASE =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[12px] tabular-nums transition-colors";

/**
 * DitherPagination — controlled page navigator. Verbatim port of
 * DitherPagination.vue. `page`/`onPageChange` is the controlled contract (Vue
 * `page` + `update:page`, guide §4). Pure render (guide §10: low risk).
 */
export function DitherPagination({
  page,
  total,
  siblings = 1,
  class: className,
  onPageChange,
}: DitherPaginationProps) {
  const pages = useMemo(
    () => pageList(page, total, siblings),
    [page, total, siblings],
  );

  function go(p: number): void {
    const next = Math.min(Math.max(p, 1), total);
    if (next !== page) onPageChange?.(next);
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center gap-1", className)}
    >
      <button
        type="button"
        className={cn(
          CELL_BASE,
          "border-border text-muted-foreground hover:text-foreground disabled:opacity-40",
        )}
        disabled={page <= 1}
        aria-label="Previous page"
        onClick={() => go(page - 1)}
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span
            key={i}
            aria-hidden="true"
            className="inline-flex h-8 min-w-8 items-center justify-center text-[12px] text-muted-foreground/50"
          >
            …
          </span>
        ) : (
          <button
            key={i}
            type="button"
            className={cn(
              CELL_BASE,
              p === page
                ? "border-foreground/30 bg-card text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            onClick={() => go(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={cn(
          CELL_BASE,
          "border-border text-muted-foreground hover:text-foreground disabled:opacity-40",
        )}
        disabled={page >= total}
        aria-label="Next page"
        onClick={() => go(page + 1)}
      >
        ›
      </button>
    </nav>
  );
}
