"use client"

import { useEffect, useMemo, useRef } from "react"
import { SPINNER_DEFAULT, spinnerFromSeed, type SpinnerParams } from "./dither-paint"
import {
  BAYER4,
  fillOf,
  type PixelColor,
  pixelMatrixFromSeed,
  pixelPrefersReducedMotion,
} from "./pixel"
import { rgb, type Rgb } from "./palette"
import {
  precompiledSrc,
  type DitherRenderMode,
  type PrecompiledDither,
} from "./precompile"
import {
  clearRasterBuffer,
  createRasterBuffer,
  putRasterBuffer,
  setOrBlendRasterPixel,
  type RasterBuffer,
} from "./raster"
import { useCanvasVisibility } from "./use-visibility"

const CELL = 2
const TAU = Math.PI * 2

/** Perimeter coordinate 0..1 walking a unit-square outline, continuous across
 *  corners — the square's answer to a circle's angle. */
function squareT(sx: number, sy: number): number {
  const ax = Math.abs(sx)
  const ay = Math.abs(sy)
  if (sy < 0 && ay >= ax) return (sx + 1) / 8 // top L→R
  if (sx > 0 && ax >= ay) return 0.25 + (sy + 1) / 8 // right T→B
  if (sy > 0 && ay >= ax) return 0.5 + (1 - sx) / 8 // bottom R→L
  return 0.75 + (1 - sy) / 8 // left B→T
}

/**
 * One frame — walk every cell, resolve its outline membership + path coord by
 * SHAPE, its brightness by FLOW, then carve detail and dither. `phase` (0..1)
 * advances over time.
 *
 * Framework-agnostic paint helper, ported verbatim from the Vue SFC's
 * `<script lang="ts">` block (it never touched Vue reactivity). Accepts a
 * `RasterBuffer` (preferred — `setOrBlendRasterPixel`) or a raw
 * `CanvasRenderingContext2D` (fallback `fillRect`).
 */
function paintSpinner(
  ctx: CanvasRenderingContext2D | RasterBuffer,
  cells: number,
  fill: Rgb,
  phase: number,
  matrix: number[][] = BAYER4,
  p: SpinnerParams = SPINNER_DEFAULT
): void {
  if ("data" in ctx) clearRasterBuffer(ctx)
  else ctx.clearRect(0, 0, cells, cells)
  const c = cells / 2
  const half = c - 0.5
  const arc = Math.max(0.05, Math.min(1, p.arc))
  const ph = (((phase * p.dir) % 1) + 1) % 1
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const nx = (x + 0.5 - c) / half // -1..1
      const ny = (y + 0.5 - c) / half
      // SHAPE: membership on the outline + path coordinate t (0..1) + angle.
      let lit: boolean
      let t: number
      let ang: number
      if (p.shape === 1) {
        const d = Math.max(Math.abs(nx), Math.abs(ny))
        lit = d >= p.innerRatio && d <= 1
        t = squareT(nx / (d || 1), ny / (d || 1))
        ang = t * TAU
      } else if (p.shape === 2) {
        lit = Math.abs(ny) <= 0.4 && Math.abs(nx) <= 1
        t = (nx + 1) / 2
        ang = t * TAU
      } else {
        const r = Math.hypot(nx, ny)
        lit = r >= p.innerRatio && r <= 1
        ang = (Math.atan2(ny, nx) + TAU) % TAU
        t = ang / TAU
      }
      if (!lit) continue
      // FLOW: brightness along the outline.
      let bright: number
      if (p.flow === 1) {
        bright = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(ph * TAU)) // breathe
      } else if (p.flow === 2) {
        bright = (0.5 + 0.5 * Math.sin((t * p.waveCount - ph) * TAU)) ** 1.6 // travelling
      } else {
        const rel = (((t - ph) % 1) + 1) % 1 // sweep head at ph
        bright = rel <= arc ? 1 - p.taper * (rel / arc) : 0
      }
      // DETAIL: dashes along the outline, radial petals on round shapes.
      if (p.segments > 0 && (t * p.segments) % 1 > 0.6) bright = 0
      if (p.spokes > 0 && p.shape !== 2)
        bright *= 0.35 + 0.65 * Math.abs(Math.cos((ang * p.spokes) / 2)) ** 2
      if (bright <= 0 || bright <= matrix[y & 3][x & 3]) continue
      const alpha = 0.4 + 0.6 * bright
      if ("data" in ctx) setOrBlendRasterPixel(ctx, x, y, fill, alpha)
      else {
        ctx.fillStyle = rgb(fill, 1, alpha)
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
}

export interface DitherSpinnerProps {
  size?: number
  color?: PixelColor
  seed?: number
  renderMode?: DitherRenderMode
  precompiled?: PrecompiledDither
}

/**
 * A seeded generative pixel spinner. One seed picks a point in a continuous
 * form space (SHAPE × FLOW × DETAIL), so a given seed always yields the same
 * rotating ring, breathing square, racing dashes, or travelling-wave donut.
 * The RAF loop paints `phase` advancing over time; it pauses while the
 * canvas is scrolled/panned off-screen and resumes (via `onWake`) on
 * re-entry — same closure, so preserved timing means no entrance replay and
 * no state loss. Falls back to a precompiled `<img>` when `precompiled` is set.
 *
 * React port of `DitherSpinner.vue` (high-risk per guide §10 — seeded
 * generative). The Vue `init()` / `restartRuntime()` / `restartToken` +
 * `onMounted`/`onBeforeUnmount` becomes a single `useEffect` owning the RAF
 * loop, returning the teardown as cleanup (guide §2/§9). `useCanvasVisibility`
 * gates the loop: it defaults PAUSED until IntersectionObserver reports
 * visible; `onWake` resumes the SAME closure (guide §9). `willReadFrequently:
 * true` on the primary context; `RasterBuffer` + `putRasterBuffer` (no
 * per-pixel `fillRect`). `prefers-reduced-motion` renders a single static
 * frame and skips the loop.
 */
export function DitherSpinner({
  size = 20,
  color = "blue",
  seed,
  renderMode = "live",
  precompiled: precompiledProp,
}: DitherSpinnerProps) {
  const spin = useMemo(
    () => (seed !== undefined ? spinnerFromSeed(seed) : SPINNER_DEFAULT),
    [seed]
  )
  const matrix = useMemo(
    () => (seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4),
    [seed]
  )
  const precompiled = useMemo(() => precompiledSrc(precompiledProp), [precompiledProp])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // `wake` is set by `init()` to a function that restarts the RAF loop; the
  // visibility hook calls it when the canvas re-enters the viewport.
  const wakeRef = useRef<(() => void) | undefined>(undefined)
  const restartToken = useRef(0)
  // Pause the spin loop while scrolled/panned off-screen; resume on re-entry.
  const isVisible = useCanvasVisibility(canvasRef, () => wakeRef.current?.())

  useEffect(() => {
    if (precompiled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return
    const fill = fillOf(color)
    const cells = Math.max(8, Math.round(size / CELL))
    canvas.width = cells
    canvas.height = cells

    let raf = 0
    let last = 0
    const buffer = createRasterBuffer(cells, cells)
    let imageData: ImageData | undefined

    // Paint the initial frame (phase 0) immediately so the spinner reads
    // instantly, even when reduced-motion skips the loop.
    paintSpinner(buffer, cells, fill, 0, matrix, spin)
    imageData = putRasterBuffer(ctx, buffer, imageData)

    wakeRef.current = undefined
    if (renderMode !== "static" && !pixelPrefersReducedMotion()) {
      const frame = (now: number) => {
        raf = 0
        if (!isVisible()) return // off-screen: pause the loop
        if (now - last < 33) {
          raf = requestAnimationFrame(frame)
          return
        }
        last = now
        paintSpinner(buffer, cells, fill, (now * spin.speed) % 1, matrix, spin)
        imageData = putRasterBuffer(ctx, buffer, imageData)
        raf = requestAnimationFrame(frame)
      }
      wakeRef.current = () => {
        if (!raf) raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }

    const token = restartToken.current
    return () => {
      // Invalidate this closure so a prop-changed re-init doesn't double-run.
      restartToken.current = token + 1
      if (raf) cancelAnimationFrame(raf)
      wakeRef.current = undefined
    }
  }, [precompiled, size, color, seed, renderMode, matrix, spin, isVisible])

  return (
    <span role="status" aria-label="Loading" className="inline-flex">
      {precompiled ? (
        <img
          src={precompiled}
          alt=""
          style={{
            width: `${size}px`,
            height: `${size}px`,
            imageRendering: "pixelated",
          }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            imageRendering: "pixelated",
          }}
        />
      )}
    </span>
  )
}
