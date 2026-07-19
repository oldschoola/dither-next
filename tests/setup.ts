// Test setup for the Next.js port — the RTL equivalent of the Vue tree's
// tests/components/setup.ts.
//
// - @testing-library/react cleanup after each test (RTL mounts into the
//   jsdom document; without cleanup, state leaks between tests).
// - @testing-library/jest-dom matchers (toBeInTheDocument, toHaveAttribute, …).
// - jsdom shims for the browser APIs the kit touches (copied verbatim from
//   tests/components/setup.ts). Canvas 2D contexts come back null in jsdom
//   and every component already guards that — painting is simply skipped,
//   which is exactly what a DOM-level test wants.

import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"

// Mark the test environment as act-compatible so React doesn't warn when we
// flush state updates via `act()` (RTL sets this automatically for its own
// render calls, but direct `act` from `react` needs the flag).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
})

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = NoopObserver as unknown as typeof ResizeObserver
}
if (typeof globalThis.IntersectionObserver === "undefined") {
  // @ts-expect-error jsdom shim
  globalThis.IntersectionObserver = NoopObserver
}
if (typeof window !== "undefined" && !window.matchMedia) {
  // @ts-expect-error jsdom shim
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })
}

// jsdom 25 + Node 22: Node ships an experimental `localStorage` global that
// shadows jsdom's and is `undefined` unless `--localstorage-file` is passed.
// The persistence module reads/writes localStorage directly, so install an
// in-memory store on both `window` and the bare global before any test runs.
// (The Vue tree's setup.ts didn't need this — it ran on jsdom 29 which still
// provided localStorage out of the box.)
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length(): number {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}
const memoryStorage = new MemoryStorage()
if (typeof window !== "undefined" && window.localStorage == null) {
  Object.defineProperty(window, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  })
}
if (typeof globalThis !== "undefined" && (globalThis as { localStorage?: unknown }).localStorage == null) {
  Object.defineProperty(globalThis, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  })
}
// jsdom 25 dropped the PointerEvent global (jsdom 29 had it). The artboard
// drag test dispatches native PointerEvents to drive the startDrag helper,
// so polyfill it as a MouseEvent subclass carrying pointerId/pointerType.
if (typeof globalThis.PointerEvent === "undefined" && typeof MouseEvent !== "undefined") {
  class PointerEventShim extends MouseEvent {
    pointerId: number
    pointerType: string
    width: number
    height: number
    pressure: number
    tangentialPressure: number
    tiltX: number
    tiltY: number
    twist: number
    isPrimary: boolean
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.pointerType = init.pointerType ?? ""
      this.width = init.width ?? 1
      this.height = init.height ?? 1
      this.pressure = init.pressure ?? 0
      this.tangentialPressure = init.tangentialPressure ?? 0
      this.tiltX = init.tiltX ?? 0
      this.tiltY = init.tiltY ?? 0
      this.twist = init.twist ?? 0
      this.isPrimary = init.isPrimary ?? false
    }
  }
  // @ts-expect-error jsdom shim — global type augmentation
  globalThis.PointerEvent = PointerEventShim
  if (typeof window !== "undefined") {
    // @ts-expect-error jsdom shim
    window.PointerEvent = PointerEventShim
  }
}
// jsdom has no layout engine, so HTMLElement.offsetParent is always null.
// The DitherDialog focus trap filters focusable elements by offsetParent to
// skip hidden ones — without layout, it sees every element as hidden and the
// Tab-wrap contract can't be exercised. Return document.body for any element
// connected to the DOM (the same value a real browser returns for a visible,
// statically-positioned element) so the trap's visibility filter works.
if (typeof HTMLElement !== "undefined") {
  Object.defineProperty(HTMLElement.prototype, "offsetParent", {
    configurable: true,
    get(this: HTMLElement) {
      return this.isConnected ? document.body : null
    },
  })
}
