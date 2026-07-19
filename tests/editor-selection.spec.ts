import { beforeEach, describe, expect, it } from "vitest"
import { createArtboard } from "@/entities/artboard/model/factory"
import {
  getEditorSnapshot,
  moveSelected,
  restoreDoc,
  selectMany,
} from "@/entities/editor/model/store"

// The Vue spec mutated `editor.artboards` directly and read positions back
// from the same reactive array. The React port is an immutable store: we seed
// via `restoreDoc`, select via `selectMany`, move via `moveSelected`, and read
// positions through `getEditorSnapshot()`. The movement contract (locked
// artboards stay put) is identical.

beforeEach(() => {
  const first = createArtboard("button", 10, 20)
  const second = createArtboard("button", 30, 40)
  second.locked = true
  restoreDoc({ artboards: [first, second], groups: [] })
  selectMany(getEditorSnapshot().artboards.map((a) => a.id))
})

describe("selected artboard movement", () => {
  it("moves every selected unlocked artboard", () => {
    moveSelected(5, -2)
    expect(getEditorSnapshot().artboards.map(({ x, y }) => [x, y])).toEqual([[15, 18], [30, 40]])
  })
})
