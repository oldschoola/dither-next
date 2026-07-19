"use client"

import { useEffect, useRef } from "react"
import { useCanvasVisibility } from "./use-visibility"
import { cn } from "./lib"
import { pixelPrefersReducedMotion, pixelMatrixFromSeed, BAYER4, clamp01, fillOf, type PixelColor } from "./pixel"
import { kitFromSeed } from "./dither-paint"
import { rgb, type Rgb } from "./palette"

const CELL = 2
const BAND_RATIO = 0.4

/** Paint the progress track. `band` null → determinate fill up to `ratio`;
 *  otherwise a 40%-wide dithered band starting at cell `band` (wrapping),
 *  with the Bayer sampling shifted so the texture itself scrolls. Ported
 *  verbatim from the Vue module-level `paintProgress`. */
function paintProgress(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  fill: Rgb,
  muted: Rgb,
  ratio: number,
  band: number | null,
  matrix: number[][] = BAYER4,
): void {
  ctx.clearRect(0, 0, cols, rows)
  const bandW = Math.max(2, Math.round(cols * BAND_RATIO))
  const span = cols + bandW
  const filled = Math.round(cols * clamp01(ratio))
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let density: number | null = null
      let bx = x
      if (band === null) {
        if (x < filled) density = 0.35 + 0.65 * ((x + 0.5) / Math.max(1, filled))
      } else {
        const p = (((x - band) % span) + span) % span
        if (p < bandW) {
          density = 0.35 + 0.65 * ((p + 0.5) / bandW)
          bx = x - band
        }
      }
      if (density !== null) {
        const lit = density > matrix[y & 3][((bx % 4) + 4) & 3]
        const k = 0.3 + density * 0.7
        ctx.fillStyle = rgb(fill, 1, clamp01(lit ? k : k * 0.4))
      } else {
        const lit = 0.25 > matrix[y & 3][x & 3]
        ctx.fillStyle = rgb(muted, 1, lit ? 0.2 : 0.06)
      }
      ctx.fillRect(x, y, 1, 1)
    }
  }
}

export interface DitherProgressProps {
  value?: number
  color?: PixelColor
  seed?: number
  indeterminate?: boolean
  className?: string
}

// Port of DitherProgress.vue. Visibility-gated canvas (AGENTS.md §9 rule 2:
// canvas defaults to PAUSED until IntersectionObserver reports visible).
// The Vue `raf`/`cols` module-level lets become refs here so the RAF loop
// reads them imperatively without triggering React re-renders each frame.
export function DitherProgress({
  value = 0,
  color: colorProp,
  seed,
  indeterminate = false,
  className,
}: DitherProgressProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef(0)
  const colsRef = useRef(0)
  const rows = 3 // h-1.5 track at CELL=2

  // Mutable values the RAF loop reads each frame — keep them in refs so the
  // closure always sees fresh values without rebuilding the loop.
  const indeterminateRef = useRef(indeterminate)
  const valueRef = useRef(value)
  const colorRef = useRef<PixelColor>("blue")
  const matrixRef = useRef<number[][]>(BAYER4)
  const reduceRef = useRef(false)

  // Sync refs from props on every render (cheap, no effect needed).
  indeterminateRef.current = indeterminate
  valueRef.current = value
  const s = seed !== undefined ? kitFromSeed(seed) : null
  colorRef.current = colorProp ?? s?.hue ?? "blue"
  matrixRef.current = seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4

  // Pause the indeterminate loop while off-screen; syncLoop resumes it on
  // re-entry (AGENTS.md: onWake resumes the SAME closure).
  const isVisible = useCanvasVisibility(canvasRef, () => syncLoop())

  function paint(band: number | null) {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { willReadFrequently: true })
    if (!canvas || !ctx || colsRef.current <= 0) return
    paintProgress(
      ctx,
      colsRef.current,
      rows,
      fillOf(colorRef.current),
      fillOf("grey"),
      clamp01(valueRef.current / 100),
      band,
      matrixRef.current,
    )
  }

  function repaint() {
    if (indeterminateRef.current && !rafRef.current) {
      // Reduced motion: a static 40% band, no animation loop.
      const bandW = Math.max(2, Math.round(colsRef.current * 0.4))
      paint(Math.round((colsRef.current - bandW) / 2))
    } else if (!indeterminateRef.current) {
      paint(null)
    }
  }

  function tick() {
    if (!isVisible()) {
      rafRef.current = 0
      return // off-screen: pause the loop
    }
    const bandW = Math.max(2, Math.round(colsRef.current * 0.4))
    paint(Math.floor(performance.now() / 50) % (colsRef.current + bandW) - bandW)
    rafRef.current = requestAnimationFrame(tick)
  }

  function syncLoop() {
    const animate = indeterminateRef.current && !reduceRef.current
    if (animate && !rafRef.current) rafRef.current = requestAnimationFrame(tick)
    if (!animate && rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    repaint()
  }

  function resize() {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    colsRef.current = Math.max(4, Math.round(root.getBoundingClientRect().width / CELL))
    canvas.width = colsRef.current
    canvas.height = rows
    repaint()
  }

  useEffect(() => {
    reduceRef.current = pixelPrefersReducedMotion()
    let ro: ResizeObserver | null = null
    const raf = requestAnimationFrame(() => {
      resize()
      syncLoop()
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(resize)
        if (rootRef.current) ro.observe(rootRef.current)
      }
    })
    return () => {
      cancelAnimationFrame(raf)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      ro?.disconnect()
    }
    // Re-run when any of the Vue `watch` sources change.
  }, [value, indeterminate, seed, colorProp])

  return (
    <div
      ref={rootRef}
      role="progressbar"
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : value}
      className={cn("relative h-1.5 w-full overflow-hidden rounded-[2px]", className)}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  )
}
