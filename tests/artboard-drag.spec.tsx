import { beforeEach, describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { act } from "react"
import { createArtboard } from "@/entities/artboard/model/factory"
import {
  getEditorSnapshot,
  restoreDoc,
  selectArtboard,
} from "@/entities/editor/model/store"
import { ArtboardFrame } from "@/widgets/canvas/Artboard"

// Port of tests/artboard-drag.spec.ts. The Vue spec mounted Artboard.vue and
// dispatched native PointerEvents on the surface + window. The React port
// (ArtboardFrame) uses the same startDrag helper, which attaches window-level
// pointermove/up listeners. We dispatch the same events and assert the same
// contract: dragging the surface moves the artboard; dragging from an
// interactive control (a <button>) does not.

beforeEach(() => {
  const ab = createArtboard("button", 10, 20)
  restoreDoc({ artboards: [ab], groups: [], viewport: { x: 0, y: 0, zoom: 1 } })
  selectArtboard(getEditorSnapshot().artboards[0].id)
})

describe("artboard surface drag", () => {
  it("moves from passive space but leaves controls interactive", async () => {
    const artboard = getEditorSnapshot().artboards[0]
    const { container } = render(<ArtboardFrame artboard={artboard} />)

    const surface = container.querySelector<HTMLElement>("[data-artboard-surface]")!
    // pointerdown on the surface starts a drag (button 0, no modifier). The
    // drag handler writes to the editor store (setArtboardPositions), which
    // re-renders ArtboardFrame — wrap the whole sequence in act so React
    // flushes the update synchronously.
    act(() => {
      surface.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerId: 1,
          clientX: 50,
          clientY: 50,
        }),
      )
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 1, clientX: 60, clientY: 55 }),
      )
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1 }))
    })

    const moved = getEditorSnapshot().artboards[0]
    expect([moved.x, moved.y]).toEqual([20, 25])

    // A pointerdown on a button (interactive control) must NOT start a drag.
    const button = container.querySelector<HTMLButtonElement>("button")!
    act(() => {
      button.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          pointerId: 2,
          clientX: 60,
          clientY: 55,
        }),
      )
      window.dispatchEvent(
        new PointerEvent("pointermove", { pointerId: 2, clientX: 80, clientY: 75 }),
      )
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 2 }))
    })

    const after = getEditorSnapshot().artboards[0]
    expect([after.x, after.y]).toEqual([20, 25])
  })
})
