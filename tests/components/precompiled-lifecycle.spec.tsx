import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { act } from "react"
import { DitherButton, DitherGradient, DitherImage, DitherSpinner } from "@dither-kit"

// Port of tests/components/precompiled-lifecycle.spec.ts. The Vue spec
// mounted the component with a `precompiled` image, then flipped it to
// undefined and asserted the canvas runtime started (getContext called) and a
// <canvas> appeared. The React port has the same lifecycle: `precompiled`
// renders an <img>; clearing it mounts a <canvas> and a useEffect schedules
// the paint (button/spinner via requestAnimationFrame, gradient via
// setTimeout(0)). We mock getContext to observe the paint and flush the
// scheduler so the effect runs in jsdom.

function mockCanvasRuntime() {
  const ctx = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn((width: number, height: number) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    })),
  }
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
  return { getContext }
}

class MockResizeObserver {
  static observed = 0
  observe = vi.fn(() => {
    MockResizeObserver.observed += 1
  })
  unobserve = vi.fn()
  disconnect = vi.fn()
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  MockResizeObserver.observed = 0
})

describe("precompiled runtime transitions", () => {
  it("starts button runtime after switching from packaged image", async () => {
    const { getContext } = mockCanvasRuntime()
    const { rerender } = render(
      <DitherButton precompiled="/assets/button.webp">Deploy</DitherButton>,
    )
    expect(screen.getByRole("button").querySelector("img")).not.toBeNull()

    rerender(<DitherButton>Deploy</DitherButton>)
    // DitherButton defers init to requestAnimationFrame to avoid forced
    // reflow; flush it so getContext is called in jsdom.
    await act(async () => {
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
    })

    expect(screen.getByRole("button").querySelector("canvas")).not.toBeNull()
    expect(getContext).toHaveBeenCalled()
  })

  it("starts gradient runtime after switching from packaged image", async () => {
    vi.useFakeTimers()
    const { getContext } = mockCanvasRuntime()
    vi.stubGlobal("ResizeObserver", MockResizeObserver)
    const { rerender } = render(<DitherGradient precompiled="/assets/gradient.webp" />)
    expect(document.querySelector("img")).not.toBeNull()

    rerender(<DitherGradient />)
    // DitherGradient live mode paints via setTimeout(0) then observes resize.
    await act(async () => {
      vi.runOnlyPendingTimers()
    })

    expect(document.querySelector("canvas")).not.toBeNull()
    expect(getContext).toHaveBeenCalled()
    expect(MockResizeObserver.observed).toBeGreaterThan(0)
  })

  it("starts image observer after switching from packaged image", async () => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver)
    const { rerender } = render(
      <DitherImage src="/sprites.webp" precompiled="/assets/image.webp" />,
    )
    expect(document.querySelector("img")).not.toBeNull()

    rerender(<DitherImage src="/sprites.webp" />)
    // DitherImage paints on image load; flush the load event + the RAF/timer.
    await act(async () => {
      const img = document.querySelector("img")
      img?.dispatchEvent(new Event("load"))
      await new Promise<void>((r) => setTimeout(r, 0))
    })

    expect(document.querySelector("canvas")).not.toBeNull()
    expect(MockResizeObserver.observed).toBeGreaterThan(0)
  })

  it("starts spinner runtime after switching from packaged image", async () => {
    const { getContext } = mockCanvasRuntime()
    const { rerender } = render(<DitherSpinner precompiled="/assets/spinner.webp" />)
    expect(document.querySelector("img")).not.toBeNull()

    rerender(<DitherSpinner />)
    await act(async () => {
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
    })

    expect(document.querySelector("canvas")).not.toBeNull()
    expect(getContext).toHaveBeenCalled()
  })
})
