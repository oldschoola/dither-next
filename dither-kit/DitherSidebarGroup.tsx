"use client";

import { useSidebar } from "./sidebar-context";

export interface DitherSidebarGroupProps {
  label?: string;
  children?: React.ReactNode;
}

/**
 * DitherSidebarGroup — labelled cluster of sidebar items. Verbatim port of
 * DitherSidebarGroup.vue. On the icon rail the label folds into a hairline
 * separator so the grouping survives the collapse.
 *
 * Consumes `SidebarContext` via `useSidebar()` (guide §3) — the Vue kit's
 * `inject(SIDEBAR_COLLAPSED, ref(false))` default becomes the hook's safe
 * default `{ collapsed: false, compact: false }`.
 */
export function DitherSidebarGroup({ label, children }: DitherSidebarGroupProps) {
  const { collapsed } = useSidebar();

  return (
    <div className="mt-4 first:mt-0" role="group" aria-label={label}>
      {label && !collapsed ? (
        <div className="px-2.5 pb-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          {label}
        </div>
      ) : label && collapsed ? (
        <div
          aria-hidden="true"
          className="mx-2.5 mb-1.5 h-px bg-border/60"
        />
      ) : null}
      <div className="grid gap-0.5">{children}</div>
    </div>
  );
}
