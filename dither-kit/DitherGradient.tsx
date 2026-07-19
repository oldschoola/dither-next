"use client"

import { useEffect, useMemo, useRef, type CSSProperties } from "react"
import { kitFromSeed } from "./dither-paint"
import { cn } from "./lib"
import {
  pixelBloomStyle,
  type PixelBloomInput,
  type PixelColor,
} from "./pixel"
import {
  DEFAULT_MAX_COLS,
  DEFAULT_MAX_ROWS,
  precompiledSrc,
  renderDitherGradient,
  STATIC_DEFAULT_MAX_COLS,
  STATIC_DEFAULT_MAX_ROWS,
  type DitherRenderMode,
  type GradientDirection,
  type PrecompiledDither,
} from "./precompile"
import { putRasterBuffer } from "./raster"

export type { DitherRenderMode, GradientDirection, PrecompiledDither }

export interface DitherGradientProps {
  from?: PixelColor
  to?: PixelColor | "transparent"
  direction?: GradientDirection
  cell?: number
  opacity?: number
  bloom?: PixelBloomInput
  seed?: number
  /** Tailwind class merge — mirrors the Vue `class` prop (guide §1). */
  class?: string
  renderMode?: DitherRenderMode
  precompiled?: PrecompiledDither
  maxCols?: number
  maxRows?: number
}

/**
 * A dithered pixel-art gradient. The backing canvas paints a seeded dithered
 * ramp from `from` to `to` in the chosen direction; a bloom layer canvas glows
 * additively over it. Falls back to a precompiled `<img>` when `precompiled`
 * is set.
 *
 * React port of `DitherGradient.vue`. Two render paths (guide §9):
 * - `renderMode="static"` — disables animation + resize observation, uses
 *   lower backing-resolution caps, and defers the initial paint to
 *   `requestIdleCallback` (with a `setTimeout` fallback for Safari) so a
 *   decorative gradient never blocks first contentful paint.
 * - `renderMode="live"` (default) — paints immediately via `setTimeout(0)`
 *   and observes resize so interactive surfaces stay in sync.
 *
 * Canvas rules: `willReadFrequently: true` on the primary context (bloom
 * canvas omits it — draw-only via `drawImage`); `RasterBuffer` +
 * `putRasterBuffer`. The `restartToken` guards against stale closures firing
 * after a prop change restarted the paint.
 */
export function DitherGradient({
  from: fromProp,
  to: toProp,
  direction: directionProp,
  cell: cellProp,
  opacity: opacityProp,
  bloom: bloomProp,
  seed,
  class: className,
  renderMode = "live",
  precompiled: precompiledProp,
  maxCols,
  maxRows,
}: DitherGradientProps) {
  const s = useMemo(
    () => (seed !== undefined ? kitFromSeed(seed) : null),
    [seed]
  )
  const effFrom = useMemo<PixelColor>(
    () => fromProp ?? s?.hue ?? "blue",
    [fromProp, s]
  )
  const effTo = useMemo<PixelColor | "transparent">(
    () => toProp ?? "transparent",
    [toProp]
  )
  const effDirection = useMemo<GradientDirection>(
    () => directionProp ?? s?.direction ?? "up",
    [directionProp, s]
  )
  const effCell = useMemo(() => cellProp ?? s?.cell ?? 3, [cellProp, s])
  const effOpacity = useMemo(() => opacityProp ?? s?.opacity ?? 1, [opacityProp, s])
  const effBloom = useMemo<PixelBloomInput>(
    () => bloomProp ?? (seed !== undefined ? seed : "off"),
    [bloomProp, seed]
  )
  const precompiled = useMemo(() => precompiledSrc(precompiledProp), [precompiledProp])
  // Effective resolution caps: static mode auto-uses lower caps unless overridden.
  const effMaxCols = useMemo(
    () => maxCols ?? (renderMode === "static" ? STATIC_DEFAULT_MAX_COLS : DEFAULT_MAX_COLS),
    [maxCols, renderMode]
  )
  const effMaxRows = useMemo(
    () => maxRows ?? (renderMode === "static" ? STATIC_DEFAULT_MAX_ROWS : DEFAULT_MAX_ROWS),
    [maxRows, renderMode]
  )
  const bloomStyle = useMemo(() => pixelBloomStyle(effBloom), [effBloom])

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<HTMLCanvasElement | null>(null)
  const restartToken = useRef(0)
  // Mutable paint state captured by the closures; refs survive renders.
  const paintState = useRef({
    from: effFrom,
    to: effTo,
    direction: effDirection,
    cell: effCell,
    opacity: effOpacity,
    maxCols: effMaxCols,
    maxRows: effMaxRows,
    seed,
  })
  paintState.current = {
    from: effFrom,
    to: effTo,
    direction: effDirection,
    cell: effCell,
    opacity: effOpacity,
    maxCols: effMaxCols,
    maxRows: effMaxRows,
    seed,
  }

  // Runtime effect: owns the idle/timeout scheduler + ResizeObserver.
  useEffect(() => {
    if (precompiled) return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const token = ++restartToken.current
    let timer = 0
    let idleHandle = 0
    let ro: ResizeObserver | null = null

    const paint = () => {
      const w = wrap
      const c = canvas
      if (!w || !c) return
      const box = w.getBoundingClientRect()
      const ctx = c.getContext("2d", { willReadFrequently: true })
      if (!ctx) return
      const ps = paintState.current
      const raster = renderDitherGradient({
        width: box.width,
        height: box.height,
        from: ps.from,
        to: ps.to,
        direction: ps.direction,
        cell: ps.cell,
        opacity: ps.opacity,
        seed: ps.seed,
        maxCols: ps.maxCols,
        maxRows: ps.maxRows,
      })
      c.width = raster.width
      c.height = raster.height
      putRasterBuffer(ctx, raster)
      const bloomCanvas = bloomRef.current
      if (bloomCanvas) {
        const bloomCtx = bloomCanvas.getContext("2d")
        if (bloomCtx) {
          bloomCanvas.width = raster.width
          bloomCanvas.height = raster.height
          bloomCtx.drawImage(c, 0, 0)
        }
      }
    }

    const stop = () => {
      clearTimeout(timer)
      timer = 0
      if (idleHandle) {
        if (typeof cancelIdleCallback === "function") cancelIdleCallback(idleHandle)
        idleHandle = 0
      }
      ro?.disconnect()
      ro = null
    }

    const schedule = () => {
      if (token !== restartToken.current || precompiled) return
      if (renderMode === "static") {
        // Defer decorative paint to idle so it never blocks first contentful
        // paint. The timeout ensures the callback fires even under heavy load
        // (W3C spec); setTimeout(0) is the Safari fallback when
        // requestIdleCallback is unavailable.
        if (typeof requestIdleCallback === "function") {
          idleHandle = requestIdleCallback(
            () => {
              idleHandle = 0
              if (token !== restartToken.current || precompiled) return
              paint()
            },
            { timeout: 2000 }
          )
        } else {
          timer = window.setTimeout(() => {
            if (token !== restartToken.current || precompiled) return
            paint()
          })
        }
      } else {
        // Live mode: paint immediately — interactive surfaces need to appear
        // instantly, then track resize.
        timer = window.setTimeout(() => {
          if (token !== restartToken.current || precompiled) return
          paint()
          if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(paint)
            ro.observe(wrap)
          }
        })
      }
    }
    schedule()

    return () => {
      restartToken.current += 1
      stop()
    }
  }, [precompiled, renderMode])

  // Repaint on visual-prop change (post-paint, like the Vue `watch(flush:"post")`).
  useEffect(() => {
    if (precompiled) return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const box = wrap.getBoundingClientRect()
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return
    const raster = renderDitherGradient({
      width: box.width,
      height: box.height,
      from: effFrom,
      to: effTo,
      direction: effDirection,
      cell: effCell,
      opacity: effOpacity,
      seed,
      maxCols: effMaxCols,
      maxRows: effMaxRows,
    })
    canvas.width = raster.width
    canvas.height = raster.height
    putRasterBuffer(ctx, raster)
    const bloomCanvas = bloomRef.current
    if (bloomCanvas) {
      const bloomCtx = bloomCanvas.getContext("2d")
      if (bloomCtx) {
        bloomCanvas.width = raster.width
        bloomCanvas.height = raster.height
        bloomCtx.drawImage(canvas, 0, 0)
      }
    }
  }, [
    precompiled,
    effFrom,
    effTo,
    effDirection,
    effCell,
    effOpacity,
    effMaxCols,
    effMaxRows,
    seed,
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
      ref={wrapRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {precompiled ? (
        <img
          src={precompiled}
          alt=""
          className="absolute inset-0 h-full w-full object-fill"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: "pixelated" }}
        />
      )}
      {precompiled && bloomStyle ? (
        <img
          src={precompiled}
          alt=""
          className="absolute inset-0 h-full w-full object-fill"
          style={bloomLayerStyle}
        />
      ) : null}
      {!precompiled && bloomStyle ? (
        <canvas
          ref={bloomRef}
          className="absolute inset-0 h-full w-full"
          style={bloomLayerStyle}
        />
      ) : null}
    </div>
  )
}
