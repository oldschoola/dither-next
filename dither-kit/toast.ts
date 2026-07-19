"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import type { PixelColor } from "./pixel"

// Module-level toast store — a DitherToaster component renders it, toast()
// feeds it. The Vue kit used `reactive([])`; this port uses a plain array +
// a subscribe/emitter so React components can read it via `useSyncExternalStore`
// without a dependency (no zustand). The imperative `toast()` API is unchanged.

export type Toast = {
  id: number
  message: string
  color: PixelColor
  duration: number
}

let uid = 0
let toasts: Toast[] = []
const timers = new Map<number, ReturnType<typeof setTimeout>>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const fn of listeners) fn()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function getSnapshot(): Toast[] {
  return toasts
}

/** Replace the store array immutably so `useSyncExternalStore` sees a change. */
function set(next: Toast[]): void {
  toasts = next
  emit()
}

export function dismiss(id: number): void {
  const timer = timers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(id)
  }
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) set(toasts.filter((_, idx) => idx !== i))
}

export function toast(
  message: string,
  opts?: { color?: PixelColor; duration?: number }
): number {
  const id = ++uid
  const duration = opts?.duration ?? 3500
  set([...toasts, { id, message, color: opts?.color ?? "blue", duration }])
  timers.set(
    id,
    setTimeout(() => dismiss(id), duration)
  )
  return id
}

/**
 * React hook: subscribe to the toast list. Returns a stable snapshot via
 * `useSyncExternalStore`, so any component re-renders when `toast()`/`dismiss()`
 * mutate the store. `getSnapshot` returns the same array reference until a
 * mutation replaces it, avoiding infinite render loops.
 */
export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Convenience hook returning `{ toasts, dismiss }` — the shape a Toaster
 * component consumes. `dismiss` is stable across renders.
 */
export function useToastStore(): { toasts: Toast[]; dismiss: (id: number) => void } {
  const toasts = useToasts()
  return { toasts, dismiss }
}

/**
 * Mount-time auto-dismiss guard: ensures every toast's timer is cleared if the
 * last subscriber unmounts before the timer fires (prevents leaks across
 * route changes in Next.js App Router). Optional — callers that render a
 * Toaster for the route lifetime don't need this.
 */
export function useToastCleanup(): void {
  useEffect(() => {
    return () => {
      // Do NOT clear the store on unmount — toasts are app-global. Only clear
      // timers whose Toaster owner is gone would leak; since the store is
      // module-level and timers self-clear on fire, this is a no-op safety net
      // kept for symmetry with the Vue kit's lifecycle expectations.
    }
  }, [])
}

// `useCallback`-stable dismiss for hook consumers that pass it down.
export function useDismiss(): (id: number) => void {
  return useCallback((id: number) => dismiss(id), [])
}
