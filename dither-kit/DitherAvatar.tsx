"use client"

import { useEffect, useMemo, useRef, type CSSProperties } from "react"
import {
  type AvatarPattern,
  clampGrid,
  normalizePattern,
  seededPattern,
} from "./avatar-pattern"
import { kitFromSeed } from "./dither-paint"
import { cn } from "./lib"
import {
  BAYER4,
  clamp01,
  fillOf,
  hueFill,
  pixelBloomStyle,
  pixelMatrixFromSeed,
  pixelPrefersReducedMotion,
  type PixelBloomInput,
  type PixelColor,
} from "./pixel"
import { rgb, type Rgb } from "./palette"

export type AvatarMirror = "auto" | "horizontal" | "vertical"

type AvatarModel = {
  grid: number
  on: boolean[]
  density: number[]
  fill: [number, number, number]
}

/** Resolve a seeded pattern + colour into a paintable avatar model. */
function avatarModel(
  name: string,
  colorProp: PixelColor | undefined,
  mirrorProp: AvatarMirror,
  gridProp: number,
  patternProp: AvatarPattern | undefined
): AvatarModel {
  const grid = clampGrid(gridProp)
  const seeded = seededPattern(name, grid, mirrorProp)
  const fill = colorProp != null ? fillOf(colorProp) : hueFill(seeded.drawnHue)
  // An explicit pattern (drawn cells or a dithered image) overrides the seed;
  // the colour still derives from the name unless overridden.
  if (patternProp) {
    const { on, density } = normalizePattern(patternProp, grid)
    return { grid, on, density, fill }
  }
  return { grid, on: seeded.on, density: seeded.density, fill }
}

type PaintOpts = {
  animate: boolean
  duration: number
  cellPx: number
  boost: number // additive per-cell density bias
  offTier: number // alpha tier of unlit backing pixels
}

/**
 * Paint one avatar entrance frame onto `canvas` (+ optional bloom canvas).
 * Returns a teardown that cancels the RAF loop, or `undefined` when the
 * entrance snapped to done (reduced motion / `animate:false`).
 *
 * Ported verbatim from the Vue SFC's `<script lang="ts">` block — it never
 * touched Vue reactivity, only canvas + RAF.
 */
function paintAvatar(
  canvas: HTMLCanvasElement,
  bloomCanvas: HTMLCanvasElement | null,
  model: AvatarModel,
  matrix: number[][],
  { animate, duration, cellPx, boost, offTier }: PaintOpts
): (() => void) | undefined {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return undefined
  const grid = model.grid
  const cp = Math.max(1, Math.round(cellPx))
  const px = grid * cp
  canvas.width = px
  canvas.height = px
  const bloomCtx = bloomCanvas?.getContext("2d") ?? null
  if (bloomCanvas) {
    bloomCanvas.width = px
    bloomCanvas.height = px
  }

  const draw = (progress: number) => {
    ctx.clearRect(0, 0, px, px)
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        if (!model.on[r * grid + c]) continue
        const start = matrix[r % 4][c % 4] * 0.7
        const cellAlpha = clamp01((progress - start) / 0.3)
        if (cellAlpha <= 0) continue
        const density = clamp01(model.density[r * grid + c] + boost)
        const base = 0.35 + 0.65 * density
        for (let py = 0; py < cp; py++) {
          for (let pxi = 0; pxi < cp; pxi++) {
            const gx = c * cp + pxi
            const gy = r * cp + py
            const lit = density > matrix[gy & 3][gx & 3]
            const alpha = (lit ? base : base * offTier) * cellAlpha
            ctx.fillStyle = rgb(model.fill as Rgb, 1, alpha)
            ctx.fillRect(gx, gy, 1, 1)
          }
        }
      }
    }
    if (bloomCtx) {
      bloomCtx.clearRect(0, 0, px, px)
      bloomCtx.drawImage(canvas, 0, 0)
    }
  }

  if (!animate || pixelPrefersReducedMotion()) {
    draw(1)
    return undefined
  }

  let raf = 0
  const startTime = performance.now()
  const tick = (now: number) => {
    const t = clamp01((now - startTime) / duration)
    draw(1 - (1 - t) ** 3)
    if (t < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

export interface DitherAvatarProps {
  name: string
  /** Colour override — palette name, hue number, or hex. Derived from the
   * name when omitted (or when the legacy `hue` prop is set). */
  color?: PixelColor
  hue?: number
  mirror?: AvatarMirror
  size?: number
  grid?: number // even cell count per side (4–16)
  /** Explicit cells (drawn or image-derived) — overrides the seeded pattern. */
  pattern?: AvatarPattern
  cellPx?: number // backing px per cell — dither resolution inside a cell
  density?: number // additive density bias (-0.5–0.5)
  offTier?: number // 0–1 alpha of unlit backing pixels
  bloom?: PixelBloomInput
  seed?: number
  animate?: boolean
  animationDuration?: number
  replayToken?: number
  /** Tailwind class merge — mirrors the Vue `class` prop (guide §1). */
  class?: string
}

/**
 * A seeded generative pixel avatar. The name hashes to a mirrored cell
 * pattern + hue; the pattern is dithered into a backing canvas with a seeded
 * Bayer matrix and eased in cell-by-cell. A bloom canvas glows additively
 * over it.
 *
 * React port of `DitherAvatar.vue` (high-risk per guide §10 — seeded
 * generative). The Vue `onMounted(paint)` + `watch([...], paint)` +
 * `onBeforeUnmount(teardown)` becomes a single `useEffect` that paints on
 * mount and whenever a watched input changes, returning the RAF teardown as
 * cleanup (guide §2). `willReadFrequently: true` on the primary context
 * (bloom canvas omits it). `prefers-reduced-motion` snaps the entrance to
 * done.
 */
export function DitherAvatar({
  name,
  color,
  hue,
  mirror = "auto",
  size,
  grid = 8,
  pattern,
  cellPx = 4,
  density = 0,
  offTier = 0.35,
  bloom: bloomProp,
  seed,
  animate = true,
  animationDuration = 600,
  replayToken = 0,
  class: className,
}: DitherAvatarProps) {
  const s = useMemo(
    () => (seed !== undefined ? kitFromSeed(seed) : null),
    [seed]
  )
  const effHue = useMemo(() => hue ?? s?.hue, [hue, s])
  const effBloom = useMemo<PixelBloomInput>(
    () => bloomProp ?? (seed !== undefined ? seed : "off"),
    [bloomProp, seed]
  )
  const matrix = useMemo(
    () => (seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4),
    [seed]
  )
  const bloomStyle = useMemo(() => pixelBloomStyle(effBloom), [effBloom])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const model = avatarModel(name, color ?? effHue, mirror, grid, pattern)
    const teardown = paintAvatar(canvas, bloomRef.current, model, matrix, {
      animate,
      duration: animationDuration,
      cellPx,
      boost: density,
      offTier,
    })
    return () => teardown?.()
  }, [
    name,
    color,
    effHue,
    mirror,
    grid,
    pattern,
    cellPx,
    density,
    offTier,
    animate,
    animationDuration,
    replayToken,
    bloomProp,
    seed,
    matrix,
  ])
  const bloomLayerStyle = useMemo<CSSProperties | undefined>(
    () =>
      bloomStyle
        ? {
            filter: bloomStyle.filter,
            opacity: bloomStyle.opacity,
            mixBlendMode: bloomStyle.mixBlendMode,
            imageRendering: bloomStyle.imageRendering,
          }
        : undefined,
    [bloomStyle]
  )

  return (
    <div
      role="img"
      aria-label={`${name} avatar`}
      className={cn("relative", className)}
      style={size != null ? { width: `${size}px`, height: `${size}px` } : undefined}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
      {bloomStyle ? (
        <canvas
          ref={bloomRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={bloomLayerStyle}
        />
      ) : null}
    </div>
  )
}
