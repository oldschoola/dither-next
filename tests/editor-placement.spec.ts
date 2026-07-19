import { beforeEach, describe, expect, it } from "vitest"
import { createArtboard } from "@/entities/artboard/model/factory"
import {
  getEditorSnapshot,
  placeArtboard,
  restoreDoc,
  type Viewport,
} from "@/entities/editor/model/store"

// The Vue spec mutated `editor.artboards` / `editor.viewport` directly on the
// reactive singleton. The React port is an immutable useSyncExternalStore
// store: we seed state via `restoreDoc` (artboards + groups) and
// `setViewport`, then read through `getEditorSnapshot()`. `placeArtboard`
// centers new frames in the current viewport — same contract as the Vue kit.

beforeEach(() => {
  // jsdom reports a 1024×768 viewport by default; pin it so the centering
  // math is deterministic (the Vue spec assumed 1280×720 — see below).
  Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true })
  Object.defineProperty(window, "innerHeight", { value: 720, configurable: true })
  restoreDoc({ artboards: [], groups: [] })
  const viewport: Viewport = { x: 100, y: 60, zoom: 2 }
  // restoreDoc preserves the existing viewport; set it explicitly after.
  restoreDoc({ artboards: [], groups: [], viewport })
})

describe("artboard placement", () => {
  it("centers new frames in the current viewport", () => {
    const placed = placeArtboard(createArtboard("button"))
    const snap = getEditorSnapshot()
    expect(placed.x).toBe(Math.round((1280 / 2 - 100) / 2 - placed.w / 2))
    expect(placed.y).toBe(Math.round((720 / 2 - 60) / 2 - placed.h / 2))
    expect(snap.selectedArtboardId).toBe(placed.id)
  })

  it("keeps consecutive frames at the exact visual center", () => {
    const first = placeArtboard(createArtboard("button"))
    const second = placeArtboard(createArtboard("button"))
    const snap = getEditorSnapshot()
    expect(second.x).toBe(first.x)
    expect(second.y).toBe(first.y)
    expect(snap.selectedArtboardId).toBe(second.id)
  })
})
