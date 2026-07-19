"use client";

import { createContext, useContext } from "react";

/**
 * SidebarContext — `SIDEBAR_COLLAPSED` + `SIDEBAR_COMPACT` (guide §3, §12).
 *
 * Vue kit injects two separate `Ref<boolean>` keys. In React they collapse to
 * one context value provided by `DitherSidebar` and consumed by `DitherSidebar
 * Group` / `DitherSidebarItem` / `DitherSidebarSub`. The values are plain
 * booleans (not refs) because React re-renders consumers when the context value
 * identity changes.
 *
 * - `collapsed`: true only in `collapse="rail"` mode while the sidebar is
 *   folded to its icon rail. A hidden sidebar (`collapse="hide"`) keeps full
 *   labels, so `collapsed` is false — matching the Vue `railCollapsed` computed.
 * - `compact`: true when `density="compact"` (tight rows).
 */
export type SidebarValue = {
  collapsed: boolean;
  compact: boolean;
};

export const SidebarContext = createContext<SidebarValue | null>(null);

/** Read the nearest sidebar context. Returns a safe default
 *  `{ collapsed: false, compact: false }` when no `DitherSidebar` is present,
 *  so items can render standalone (the Vue kit's `inject(key, ref(false))`
 *  default). */
export function useSidebar(): SidebarValue {
  const ctx = useContext(SidebarContext);
  return ctx ?? { collapsed: false, compact: false };
}
