"use client"

import { useEffect, useRef, useState } from "react"

export type Dimensions = { width: number; height: number }

/**
 * Tracks an element's CSS pixel size via {@link ResizeObserver}. Uses the
 * observer's `contentRect` rather than `getBoundingClientRect()` so a parent
 * transform morph cannot trick the chart into measuring a scaled size and
 * locking its canvas to it.
 *
 * React port of the Vue `useChartDimensions` composable — returns a ref
 * object to bind (`ref={el}`) and a reactive size. The ref is stable across
 * renders so callers can read `el.current` in event handlers.
 */
export function useChartDimensions<T extends HTMLElement = HTMLDivElement>() {
  const el = useRef<T | null>(null)
  const [size, setSize] = useState<Dimensions>({ width: 0, height: 0 })

  // Keep the latest size in a ref so the ResizeObserver closure always writes
  // through the same setter without stale-capture issues across renders.
  const sizeRef = useRef(size)
  sizeRef.current = size

  useEffect(() => {
    const node = el.current
    if (!node) return

    const update = (width: number, height: number) => {
      const nextWidth = Math.max(0, Math.round(width))
      const nextHeight = Math.max(0, Math.round(height))
      const prev = sizeRef.current
      if (prev.width === nextWidth && prev.height === nextHeight) return
      setSize({ width: nextWidth, height: nextHeight })
    }

    const measure = (entry: ResizeObserverEntry) =>
      update(entry.contentRect.width, entry.contentRect.height)
    const measureNode = () => update(node.clientWidth, node.clientHeight)

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) measure(entry)
      else measureNode()
    })
    ro.observe(node)
    // Fallback: if the observer hasn't fired by the next tick (e.g. the element
    // already has a non-zero size), measure synchronously.
    const fallback = window.setTimeout(() => {
      if (!sizeRef.current.width && !sizeRef.current.height) measureNode()
    }, 0)

    return () => {
      clearTimeout(fallback)
      ro.disconnect()
    }
  }, [])

  return { el, size }
}
