"use client"

import { useEffect, useMemo, useRef, type CSSProperties } from "react"
import { CONTROL_BUTTON } from "./control"
import { kitFromSeed } from "./dither-paint"
import { cn } from "./lib"
import {
  pixelBloomStyle,
  pixelPrefersReducedMotion,
  type PixelBloomInput,
  type PixelColor,
} from "./pixel"
import {
  DEFAULT_MAX_COLS,
  DEFAULT_MAX_ROWS,
  precompiledSrc,
  renderDitherButton,
  STATIC_DEFAULT_MAX_COLS,
  STATIC_DEFAULT_MAX_ROWS,
  type DitherRenderMode,
  type PrecompiledDither,
} from "./precompile"
import { putRasterBuffer, type RasterBuffer } from "./raster"

export type ButtonVariant = "gradient" | "dotted" | "hatched" | "solid"
export type { DitherRenderMode, PrecompiledDither }

/** Props for {@link DitherButton}. Extends the native `<button>` attributes so
 *  any DOM-level prop (`onClick`, `aria-*`, `data-*`, `form`, …) falls through
 *  to the underlying button — the Vue kit's `$attrs` fallthrough (guide §5).
 *  `color`/`type`/`disabled` are omitted from the base because the kit
 *  redefines them. `class` className prop (React idiom, guide §1). */
export interface DitherButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "color" | "type" | "disabled" | "className"
  > {
  color?: PixelColor
  variant?: ButtonVariant
  bloom?: PixelBloomInput
  /** css px per dither cell — chunkiness. */
  cell?: number
  seed?: number
  type?: "button" | "submit" | "reset"
  loading?: boolean
  disabled?: boolean
  /** Tailwind class merge — className prop (React idiom, guide §1). */
  className?: string
  renderMode?: DitherRenderMode
  precompiled?: PrecompiledDither
  maxCols?: number
  maxRows?: number
  children?: React.ReactNode
}

/**
 * A dithered pixel-art button. The backing canvas paints a seeded dither
 * fill whose intensity eases toward a hover/press target; a bloom layer
 * canvas glows additively over it. Falls back to a precompiled `<img>` when
 * `precompiled` is set, and to an animated three-dot spinner when `loading`.
 *
 * React port of `DitherButton.vue` (high-risk per guide §10). The Vue
 * `init()` / `restartRuntime()` / `restartToken` pattern becomes a single
 * `useEffect` that owns the RAF loop, pointer listeners, and ResizeObserver,
 * tearing all down in cleanup (guide §9). The initial `getBoundingClientRect`
 * is deferred to `requestAnimationFrame` so mounting many buttons at once
 * doesn't force synchronous layout — the Vue kit's comment notes this beats
 * `nextTick` (which runs inside the flush queue and forces sync layout).
 *
 * Canvas rules honored (guide §9 / AGENTS.md): `willReadFrequently: true` on
 * the primary context (the bloom canvas omits it — draw-only via
 * `drawImage`); `RasterBuffer` + `putRasterBuffer` (no per-pixel
 * `fillRect`); `prefers-reduced-motion` gates animation; `renderMode="static"`
 * disables animation + resize observation.
 *
 * Native button attributes (onClick, aria-*, data-*, …) fall through via the
 * `...rest` spread — the Vue kit's `$attrs` fallthrough (guide §5).
 */
export function DitherButton({
  color: colorProp,
  variant: variantProp,
  bloom: bloomProp,
  cell: cellProp,
  seed,
  type = "button",
  loading = false,
  disabled = false,
  className,
  renderMode = "live",
  precompiled: precompiledProp,
  maxCols,
  maxRows,
  children,
  ...rest
}: DitherButtonProps) {
  const s = useMemo(
    () => (seed !== undefined ? kitFromSeed(seed) : null),
    [seed]
  )
  const precompiled = useMemo(() => precompiledSrc(precompiledProp), [precompiledProp])
  const color = useMemo<PixelColor>(
    () => colorProp ?? s?.hue ?? "blue",
    [colorProp, s]
  )
  const variant = useMemo<ButtonVariant>(
    () => variantProp ?? s?.variant ?? "gradient",
    [variantProp, s]
  )
  const bloom = useMemo<PixelBloomInput>(
    () => bloomProp ?? (seed !== undefined ? seed : "off"),
    [bloomProp, seed]
  )
  const cell = useMemo(() => cellProp ?? s?.cell ?? 2, [cellProp, s])
  // Effective resolution caps: static mode auto-uses lower caps unless overridden.
  const effMaxCols = useMemo(
    () => maxCols ?? (renderMode === "static" ? STATIC_DEFAULT_MAX_COLS : DEFAULT_MAX_COLS),
    [maxCols, renderMode]
  )
  const effMaxRows = useMemo(
    () => maxRows ?? (renderMode === "static" ? STATIC_DEFAULT_MAX_ROWS : DEFAULT_MAX_ROWS),
    [maxRows, renderMode]
  )
  const bloomStyle = useMemo(() => pixelBloomStyle(bloom), [bloom])

  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const bloomRef = useRef<HTMLCanvasElement | null>(null)
  // restartToken guards against stale RAF closures firing after a prop change
  // restarted the loop (the Vue `restartToken` pattern, guide §9).
  const restartToken = useRef(0)

  useEffect(() => {
    if (precompiled) return
    const button = buttonRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { willReadFrequently: true })
    if (!button || !canvas || !ctx) return
    const bloomCanvas = bloomRef.current
    const bloomCtx = bloomCanvas?.getContext("2d") ?? null
    const reduce = pixelPrefersReducedMotion()
    const animated = renderMode !== "static" && !reduce

    let cols = 0
    let rows = 0
    let intensity = 0
    let target = 0
    let hovered = false
    let raf = 0
    let raster: RasterBuffer | undefined
    let imageData: ImageData | undefined

    const paint = () => {
      raster = renderDitherButton(
        {
          width: cols,
          height: rows,
          color,
          variant,
          cell: 1,
          intensity,
          seed,
          maxCols: effMaxCols,
          maxRows: effMaxRows,
        },
        raster
      )
      imageData = putRasterBuffer(ctx, raster, imageData)
      if (bloomCanvas && bloomCtx) {
        bloomCtx.clearRect(0, 0, cols, rows)
        bloomCtx.drawImage(canvas, 0, 0)
      }
    }

    const tick = () => {
      const d = target - intensity
      if (Math.abs(d) < 0.01) {
        intensity = target
        paint()
        raf = 0
        return
      }
      intensity += d * 0.16
      paint()
      raf = requestAnimationFrame(tick)
    }

    const setTarget = (t: number) => {
      target = t
      if (reduce) {
        intensity = t
        paint()
      } else if (animated && !raf) {
        raf = requestAnimationFrame(tick)
      }
    }

    const resize = () => {
      const box = button.getBoundingClientRect()
      const cellPx = Math.max(1, cell)
      cols = Math.max(4, Math.round(box.width / cellPx))
      rows = Math.max(4, Math.round(box.height / cellPx))
      canvas.width = cols
      canvas.height = rows
      if (bloomCanvas) {
        bloomCanvas.width = cols
        bloomCanvas.height = rows
      }
      paint()
    }

    const enter = () => {
      hovered = true
      setTarget(1)
    }
    const leave = () => {
      hovered = false
      setTarget(0)
    }
    const down = () => {
      if (!button.disabled) setTarget(1.5)
    }
    const up = () => setTarget(hovered ? 1 : 0)

    if (animated) {
      button.addEventListener("pointerenter", enter)
      button.addEventListener("pointerleave", leave)
      button.addEventListener("pointerdown", down)
      button.addEventListener("pointerup", up)
      button.addEventListener("pointercancel", up)
    }

    const ro =
      renderMode !== "static" && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(resize)
        : null
    ro?.observe(button)

    // Defer the initial measure + paint to rAF so mounting many buttons at
    // once doesn't force synchronous reflow (guide §9).
    const token = ++restartToken.current
    const initialRaf = requestAnimationFrame(() => {
      if (token !== restartToken.current) return
      resize()
    })

    return () => {
      if (raf) cancelAnimationFrame(raf)
      cancelAnimationFrame(initialRaf)
      button.removeEventListener("pointerenter", enter)
      button.removeEventListener("pointerleave", leave)
      button.removeEventListener("pointerdown", down)
      button.removeEventListener("pointerup", up)
      button.removeEventListener("pointercancel", up)
      ro?.disconnect()
    }
  }, [
    precompiled,
    color,
    variant,
    bloom,
    cell,
    renderMode,
    loading,
    disabled,
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
    <button
      ref={buttonRef}
      type={type}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
      className={cn(
        CONTROL_BUTTON,
        "relative isolate inline-flex min-h-10 items-center justify-center gap-2 overflow-hidden rounded-md px-4 py-2 font-mono text-xs text-foreground transition-[opacity,scale] active:scale-[0.96] motion-reduce:transition-none",
        className
      )}
      {...rest}
    >
      {precompiled ? (
        <img
          src={precompiled}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full object-fill"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 -z-10 h-full w-full"
          style={{ imageRendering: "pixelated" }}
        />
      )}
      {precompiled && bloomStyle ? (
        <img
          src={precompiled}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-fill"
          style={bloomLayerStyle}
        />
      ) : null}
      {!precompiled && bloomStyle ? (
        <canvas
          ref={bloomRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
          style={bloomLayerStyle}
        />
      ) : null}
      {loading ? (
        <span aria-hidden="true" className="relative grid grid-cols-3 gap-0.5">
          {[0, 1, 2].map((n) => (
            <span key={n} className="size-1 bg-current opacity-70" />
          ))}
        </span>
      ) : null}
      <span className="relative">{children}</span>
    </button>
  )
}
