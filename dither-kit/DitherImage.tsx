"use client"

import { useEffect, useMemo, useRef } from "react"
import { kitFromSeed } from "./dither-paint"
import { cn } from "./lib"
import { BAYER4, pixelMatrixFromSeed } from "./pixel"
import {
  DEFAULT_MAX_COLS,
  DEFAULT_MAX_ROWS,
  precompiledSrc,
  STATIC_DEFAULT_MAX_COLS,
  STATIC_DEFAULT_MAX_ROWS,
  type DitherRenderMode,
  type PrecompiledDither,
} from "./precompile"

/**
 * Ordered-dither an image into chunky cells: each cell keeps its source hue,
 * the Bayer matrix decides whether it renders lit or dimmed — the same
 * texture the buttons and charts use, applied to arbitrary artwork.
 *
 * Framework-agnostic paint helper, ported verbatim from the Vue SFC's
 * `<script lang="ts">` block (it never touched Vue reactivity).
 */
function paintImage(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  width: number,
  height: number,
  cell: number,
  focusY: number,
  fade: number,
  matrix: number[][],
  maxCols: number,
  maxRows: number
): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx || width <= 0 || height <= 0 || !img.naturalWidth) return
  const cols = Math.min(maxCols, Math.max(4, Math.round(width / cell)))
  const rows = Math.min(maxRows, Math.max(4, Math.round(height / cell)))
  canvas.width = cols
  canvas.height = rows

  // Cover-fit: scale source to fill the cell grid, crop centered.
  const scale = Math.max(cols / img.naturalWidth, rows / img.naturalHeight)
  const sw = cols / scale
  const sh = rows / scale
  const sx = (img.naturalWidth - sw) / 2
  const sy = (img.naturalHeight - sh) * focusY
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows)

  const px = ctx.getImageData(0, 0, cols, rows)
  const d = px.data
  const f = Math.max(1, Math.round(fade / cell)) // fade margin in cells
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4
      const t = matrix[y & 3][x & 3]
      // Dithered dissolve: toward every edge pixels first darken, then drop
      // out through the same Bayer matrix — the image melts into the page.
      let e = 1
      if (fade > 0) {
        e = Math.min(Math.min(x, cols - 1 - x, y, rows - 1 - y) / f, 1)
        if (e < 1 && e * e <= t) {
          d[i + 3] = 0
          continue
        }
      }
      const luma = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
      const k = (luma > t ? 1 : 0.45) * (0.25 + 0.75 * e)
      d[i] = Math.round(d[i] * k)
      d[i + 1] = Math.round(d[i + 1] * k)
      d[i + 2] = Math.round(d[i + 2] * k)
    }
  }
  ctx.putImageData(px, 0, 0)
}

export interface DitherImageProps {
  src: string
  alt?: string
  /** css px per dither cell — bigger means chunkier. */
  cell?: number
  /** vertical crop focus for cover-fit: 0 top, 0.5 center, 1 bottom. */
  focusY?: number
  /** css px of dithered edge dissolve — 0 keeps hard edges. */
  fade?: number
  seed?: number
  /** Tailwind class merge — mirrors the Vue `class` prop (guide §1). */
  class?: string
  renderMode?: DitherRenderMode
  precompiled?: PrecompiledDither
  maxCols?: number
  maxRows?: number
}

/**
 * A dithered image — cover-fit + Bayer-ordered dither + optional edge
 * dissolve. Falls back to a precompiled `<img>` when `precompiled` is set.
 *
 * React port of `DitherImage.vue`. The Vue `nextTick` deferrals become
 * `useEffect`/`setTimeout` (guide §7 — generic defer). Static mode disables
 * resize observation; live mode observes resize so the dither tracks its
 * container. `willReadFrequently: true` on the context (it calls
 * `getImageData`/`putImageData`). The `restartToken` guards against stale
 * closures firing after a prop change.
 */
export function DitherImage({
  src,
  alt = "",
  cell: cellProp,
  focusY: focusYProp,
  fade: fadeProp,
  seed,
  class: className,
  renderMode = "live",
  precompiled: precompiledProp,
  maxCols,
  maxRows,
}: DitherImageProps) {
  const s = useMemo(
    () => (seed !== undefined ? kitFromSeed(seed) : null),
    [seed]
  )
  const effCell = useMemo(() => cellProp ?? s?.cell ?? 3, [cellProp, s])
  const effFocusY = useMemo(() => focusYProp ?? s?.focusY ?? 0.5, [focusYProp, s])
  const effFade = useMemo(() => fadeProp ?? s?.fade ?? 0, [fadeProp, s])
  const matrix = useMemo(
    () => (seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4),
    [seed]
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

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // One persistent Image element — loads `src` once, repaints on load + resize.
  const imgRef = useRef<HTMLImageElement | null>(null)
  if (imgRef.current === null && typeof Image !== "undefined") {
    const im = new Image()
    im.crossOrigin = "anonymous"
    imgRef.current = im
  }
  const restartToken = useRef(0)

  // Mutable paint state captured by the load closure; updated each render.
  const paintState = useRef({
    cell: effCell,
    focusY: effFocusY,
    fade: effFade,
    matrix,
    maxCols: effMaxCols,
    maxRows: effMaxRows,
  })
  paintState.current = { cell: effCell, focusY: effFocusY, matrix, maxCols: effMaxCols, maxRows: effMaxRows, fade: effFade }

  // Runtime effect: load the image + (live) observe resize.
  useEffect(() => {
    if (precompiled) return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!wrap || !canvas || !img) return

    const token = ++restartToken.current
    let ro: ResizeObserver | null = null

    const paint = () => {
      const w = wrap
      const c = canvas
      if (!w || !c) return
      const box = w.getBoundingClientRect()
      const ps = paintState.current
      paintImage(
        c,
        img,
        box.width,
        box.height,
        ps.cell,
        ps.focusY,
        ps.fade,
        ps.matrix,
        ps.maxCols,
        ps.maxRows
      )
    }

    const onImgLoad = () => paint()
    img.addEventListener("load", onImgLoad)

    // Defer the load kick to the next tick (Vue used nextTick; guide §7 maps a
    // generic defer to useEffect, and the setTimeout(0) mirrors the Vue
    // `nextTick` queue flush).
    const timer = window.setTimeout(() => {
      if (token !== restartToken.current || precompiled) return
      if (img.src !== src) img.src = src
      else if (img.complete) paint()
      if (renderMode !== "static" && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(paint)
        if (wrapRef.current) ro.observe(wrapRef.current)
      }
    })

    return () => {
      restartToken.current += 1
      window.clearTimeout(timer)
      img.removeEventListener("load", onImgLoad)
      ro?.disconnect()
      ro = null
    }
  }, [src, precompiled, renderMode, seed])

  // Repaint on visual-prop change (post-paint, like the Vue
  // `watch([effCell, effFocusY, effFade, matrix, effMaxCols, effMaxRows], paint, { flush: "post" })`).
  useEffect(() => {
    if (precompiled) return
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!wrap || !canvas || !img) return
    if (!img.complete || !img.naturalWidth) return
    const box = wrap.getBoundingClientRect()
    paintImage(
      canvas,
      img,
      box.width,
      box.height,
      effCell,
      effFocusY,
      effFade,
      matrix,
      effMaxCols,
      effMaxRows
    )
  }, [precompiled, effCell, effFocusY, effFade, matrix, effMaxCols, effMaxRows])

  return (
    <div
      ref={wrapRef}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : "true"}
      className={cn("relative overflow-hidden", className)}
    >
      {precompiled ? (
        <img
          src={precompiled}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: "pixelated" }}
        />
      )}
    </div>
  )
}
