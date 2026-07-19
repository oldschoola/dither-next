import { afterEach, describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import { act } from "react"
import { getEditorSnapshot, setViewport } from "@/entities/editor"
import {
  hydrate,
  startAutosave,
  stopAutosave,
  useActiveProjectId,
} from "@/features/persistence"

// Port of tests/components/persistence-autosave.spec.ts. The Vue spec watched
// `editor.viewport` via a deep `watch` and read `activeProjectId.value`; the
// React port subscribes to the editor store's `subscribe()` (which fires on
// every emit, including setViewport) and exposes the active id through the
// `useActiveProjectId()` hook. We render a probe to read the hook value
// (the doc key is `dither-studio-doc-${activeId}`), then assert the persisted
// viewport matches after the 400ms debounce.

function ActiveIdProbe({ onId }: { onId: (id: string) => void }) {
  const id = useActiveProjectId()
  return <div data-testid="active-id" data-id={id} onClick={() => onId(id)} />
}

afterEach(() => {
  stopAutosave()
  vi.useRealTimers()
  localStorage.clear()
})

describe("studio autosave", () => {
  it("persists viewport changes without document edits", async () => {
    vi.useFakeTimers()
    localStorage.clear()
    hydrate()
    startAutosave()

    let activeId = ""
    render(<ActiveIdProbe onId={(id) => (activeId = id)} />)
    // hydrate() seeds the first project; the probe reads its id.
    // Re-render path isn't needed — the hook returns the current id on mount.
    const probe = document.querySelector<HTMLElement>("[data-testid='active-id']")
    activeId = probe?.getAttribute("data-id") ?? activeId
    expect(activeId).not.toBe("")

    setViewport({ x: 123, y: 45, zoom: 1.5 })
    // setViewport emits synchronously; the autosave subscription schedules a
    // 400ms debounced flushSave. Advance past it.
    await act(async () => {
      vi.advanceTimersByTime(401)
    })

    const raw = localStorage.getItem(`dither-studio-doc-${activeId}`)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).viewport).toEqual({ x: 123, y: 45, zoom: 1.5 })
    // Sanity: the editor snapshot reflects the same viewport.
    expect(getEditorSnapshot().viewport).toEqual({ x: 123, y: 45, zoom: 1.5 })
  })
})
