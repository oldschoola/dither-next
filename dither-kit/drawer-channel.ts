"use client";

import { createContext, useContext } from "react";

/**
 * DrawerChannel — nested-drawer context (guide §3, §12).
 *
 * Vue kit: `DRAWER_CHANNEL: InjectionKey<DrawerChannel>` provided by every
 * `DitherDrawer` (so a child drawer can push its parent back) and by
 * `DitherDrawerIndent` at the app root (so the whole app pushes back when a
 * root drawer opens). React port: a single `DrawerChannelContext` consumed via
 * `useDrawerChannel()`, with the same `notify(delta)` contract — `+1` when a
 * drawer opens, `-1` when it closes/unmounts.
 *
 * `DitherDrawerIndent` is the app-level provider that owns the `openCount`
 * state; `DitherDrawer` both consumes (to notify its parent) and provides
 * (to be notified by its own children). A consumer with no provider gets
 * `null` — drawers outside an indent simply don't push anything back.
 */
export type DrawerChannel = {
  notify: (delta: number) => void;
};

export const DrawerChannelContext = createContext<DrawerChannel | null>(null);

/** Read the nearest drawer channel. Returns `null` when none is present so a
 *  standalone drawer (no `DitherDrawerIndent` ancestor) simply skips the
 *  push-back notification. */
export function useDrawerChannel(): DrawerChannel | null {
  return useContext(DrawerChannelContext);
}
