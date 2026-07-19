"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe DOM readiness for portal components (guide §6).
 *
 * Next.js renders `"use client"` components on the server during SSR of a
 * parent page, where `document` is undefined. A portal must not call
 * `createPortal(..., document.body)` until the client has hydrated. This hook
 * returns `false` on the server/first render and `true` after the first
 * effect commits, which is the React idiom for "are we in the browser?".
 *
 * Used by DitherDialog, DitherAlertDialog, DitherContextMenu, DitherDrawer,
 * DitherToaster — every overlay that teleports to `document.body`.
 */
export function useInDom(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
