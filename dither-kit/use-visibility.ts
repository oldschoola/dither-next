"use client"

import { useEffect, useRef } from "react"

/**
 * Tracks whether an element is on screen so canvas paint loops can fully stop
 * while scrolled/panned out of view (a chart off-screen costs nothing instead
 * of burning a 60fps rAF loop). `onWake` fires when the element re-enters view;
 * the loop resumes its SAME closure, so preserved timing means no entrance
 * replay and no state loss — any in-progress entrance simply snaps to done.
 *
 * React port of the Vue `useCanvasVisibility` composable. Returns a `visible()`
 * getter the RAF loop reads each frame, and takes a ref to the observed
 * element plus a wake callback.
 */
export function useCanvasVisibility(
  el: React.RefObject<HTMLElement | null>,
  onWake?: () => void
): () => boolean {
  // `visibleRef` is the source of truth the closure reads each frame; the IO
  // callback writes to it. Reading a ref (not state) avoids re-rendering the
  // host component on every visibility transition — the paint loop owns timing.
  const visibleRef = useRef<boolean>(
    typeof IntersectionObserver === "undefined"
  )

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const node = el.current
    if (!node) return
    const io = new IntersectionObserver(([entry]) => {
      const v = entry?.isIntersecting ?? true
      visibleRef.current = v
      if (v) onWake?.() // now visible — resume the paused loop
    })
    io.observe(node)
    return () => io.disconnect()
  }, [el, onWake])

  return () => visibleRef.current
}
