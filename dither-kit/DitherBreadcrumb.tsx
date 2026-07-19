import { cn } from "./lib";

export type Crumb = { label: string; href?: string };

export interface DitherBreadcrumbProps {
  items: Crumb[];
  separator?: string;
  class?: string;
}

/**
 * DitherBreadcrumb — static breadcrumb list. Verbatim port of
 * DitherBreadcrumb.vue. Pure render (guide §10: low risk).
 *
 * The last item is the current page (`aria-current="page"`); earlier items with
 * an `href` render as links, the rest as plain text.
 */
export function DitherBreadcrumb({
  items,
  separator = "/",
  class: className,
}: DitherBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[13px]", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <a
                  href={c.href}
                  className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
                >
                  {c.label}
                </a>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(
                    last ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {c.label}
                </span>
              )}
              {!last ? (
                <span
                  aria-hidden="true"
                  className="select-none text-muted-foreground/40"
                >
                  {separator}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
