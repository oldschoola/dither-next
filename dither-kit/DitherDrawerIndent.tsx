"use client";

import { useCallback, useMemo, useState } from "react";

import { cn } from "./lib";
import { DrawerChannelContext, type DrawerChannel } from "./drawer-channel";

export interface DitherDrawerIndentProps {
  class?: string;
  children?: React.ReactNode;
}

/**
 * DitherDrawerIndent — app-level drawer indent provider. Verbatim port of
 * DitherDrawerIndent.vue.
 *
 * Wrap your app's main UI: it scales back while any root drawer inside is open
 * — the same channel nested drawers use, provided at app level. A child
 * `DitherDrawer` consumes this via `useDrawerChannel()` and calls `notify(+1)`
 * on open / `notify(-1)` on close/unmount, driving `openCount`.
 *
 * The Vue kit's `provide(DRAWER_CHANNEL, { notify })` becomes a
 * `<DrawerChannelContext value={...}>` wrapping the children (guide §3).
 */
export function DitherDrawerIndent({ class: className, children }: DitherDrawerIndentProps) {
  const [openCount, setOpenCount] = useState(0);
  // Stable notify identity so drawers' open-flip effect doesn't re-run on every
  // openCount change (they depend on `parent` = the context value).
  const notify = useCallback((d: number) => {
    setOpenCount((c) => c + d);
  }, []);
  const channelValue = useMemo<DrawerChannel>(() => ({ notify }), [notify]);

  return (
    <DrawerChannelContext value={channelValue}>
      <div
        className={cn(
          "origin-top transition-[transform,filter,border-radius] duration-200 motion-reduce:transition-none",
          openCount > 0 ? "scale-[0.98] rounded-xl brightness-75" : "",
          className,
        )}
      >
        {children}
      </div>
    </DrawerChannelContext>
  );
}
