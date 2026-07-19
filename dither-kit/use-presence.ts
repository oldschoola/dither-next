"use client"

import { useEffect, useState } from "react"

/**
 * Mount/unmount presence for CSS transitions. Keeps the element mounted for
 * `durationMs` after `show` flips false so a leave transition can play, then
 * unmounts. Mirrors the Vue `<Transition>` enter/leave lifecycle the kit uses
 * for Dialog/Drawer/Popover/Tooltip — no `react-transition-group` dependency
 * (guide §6: prefer a local ~20-line hook).
 *
 * Returns the *rendered* visibility: true while entering or visible, false
 * once the leave transition has elapsed and the node should unmount. The
 * caller toggles a CSS class on the (always-mounted-while-present) node to
 * drive the actual animation.
 */
export function usePresence(show: boolean, durationMs: number): boolean {
  // `present` is true while the node should be in the DOM (entering, visible,
  // or leaving). It lags `show` by `durationMs` on the way down.
  const [present, setPresent] = useState(show)

  useEffect(() => {
    if (show) {
      // Entering: mount immediately (clear any pending unmount timer).
      setPresent(true)
      return
    }
    // Leaving: keep mounted until the CSS leave transition finishes.
    const t = window.setTimeout(() => setPresent(false), durationMs)
    return () => window.clearTimeout(t)
  }, [show, durationMs])

  // When `show` goes true→false we stay present; the caller reads `show` to
  // toggle the leave class. When present flips false we unmount entirely.
  return present
}
