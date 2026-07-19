"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react"
import { cn } from "./lib"
import { BAYER4, clamp01, fillOf, pixelMatrixFromSeed, type PixelColor } from "./pixel"
import { kitFromSeed } from "./dither-paint"
import { rgb, type Rgb } from "./palette"

const CELL = 2

export type SliderVariant = "gradient" | "dotted" | "hatched" | "solid"

/** Paint the track: the span between lo..hi dithers in the chosen texture,
 *  the rest reads as a muted rail; optional tick columns mark divisions.
 *  Ported verbatim from the Vue module-level `paintTrack`. */
function paintTrack(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  fill: Rgb,
  muted: Rgb,
  lo: number,
  hi: number,
  variant: SliderVariant,
  ticks: number[],
  matrix: number[][] = BAYER4,
): void {
  ctx.clearRect(0, 0, cols, rows)
  const a = Math.round(cols * clamp01(lo))
  const b = Math.round(cols * clamp01(hi))
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x >= a && x < b) {
        const t = (x - a + 0.5) / Math.max(1, b - a)
        const density =
          variant === "gradient" ? 0.35 + 0.65 * t : variant === "dotted" ? 0.5 : 0.75
        if (variant === "hatched" && ((x + y) & 3) >= 2) {
          ctx.fillStyle = rgb(fill, 1, 0.12)
        } else {
          const lit = variant === "solid" || density > matrix[y & 3][x & 3] - (variant === "dotted" ? 0.12 : 0)
          if (variant === "dotted" && !lit) {
            ctx.fillStyle = rgb(fill, 1, 0.1)
          } else {
            const k = 0.3 + density * 0.7
            ctx.fillStyle = rgb(fill, 1, clamp01(lit ? k : k * 0.4))
          }
        }
      } else {
        const lit = 0.25 > matrix[y & 3][x & 3]
        ctx.fillStyle = rgb(muted, 1, lit ? 0.2 : 0.06)
      }
      ctx.fillRect(x, y, 1, 1)
    }
  }
  for (const t of ticks) {
    const x = Math.min(cols - 1, Math.round(cols * t))
    const inFill = x >= a && x < b
    ctx.fillStyle = rgb(muted, 2, inFill ? 0.9 : 0.45)
    ctx.fillRect(x, 0, 1, rows)
  }
}

export interface DitherSliderProps {
  /** A number, or a [lo, hi] pair for a range slider. */
  value: number | [number, number]
  /** Accessible name for the thumb(s). */
  label?: string
  min?: number
  max?: number
  step?: number
  color?: PixelColor
  /** Fill texture — same vocabulary as the charts. */
  variant?: SliderVariant
  /** Paint tick columns at each step (or 10 divisions when steps are dense). */
  ticks?: boolean
  /** Show a value bubble above the thumb while dragging or focused. */
  showValue?: boolean
  disabled?: boolean
  seed?: number
  className?: string
  onChange?: (value: number | [number, number]) => void
}

// Port of DitherSlider.vue — the highest-risk control (canvas track + pointer
// drag + resize). Vue `active`/`focused` refs → useState; the canvas/resize
// plumbing uses refs to keep the RAF/ResizeObserver closures stable.
export function DitherSlider({
  value,
  label,
  min = 0,
  max = 100,
  step = 1,
  color: colorProp,
  variant: variantProp,
  ticks = false,
  showValue = false,
  disabled = false,
  seed,
  className,
  onChange,
}: DitherSliderProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // `active`/`focused` drive the value bubble; they re-render, so useState.
  const [active, setActive] = useState<-1 | 0 | 1>(-1)
  const [focused, setFocused] = useState<-1 | 0 | 1>(-1)

  const s = useMemo(() => (seed !== undefined ? kitFromSeed(seed) : null), [seed])
  const color = useMemo<PixelColor>(() => colorProp ?? s?.hue ?? "blue", [colorProp, s])
  const variant = useMemo<SliderVariant>(
    () => variantProp ?? s?.variant ?? "gradient",
    [variantProp, s],
  )
  const matrix = useMemo(() => (seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4), [seed])

  const isRange = Array.isArray(value)
  const lo = isRange ? (value as [number, number])[0] : min
  const hi = isRange ? (value as [number, number])[1] : (value as number)
  const span = Math.max(1e-9, max - min)
  const toRatio = (v: number) => clamp01((v - min) / span)

  const tickRatios = useMemo(() => {
    if (!ticks) return []
    const steps = span / step
    const count = steps <= 25 ? Math.round(steps) : 10
    return Array.from({ length: count + 1 }, (_, i) => i / count)
  }, [ticks, span, step])

  function paint() {
    const root = rootRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { willReadFrequently: true })
    if (!root || !canvas || !ctx) return
    const box = root.getBoundingClientRect()
    const cols = Math.max(4, Math.round(box.width / CELL))
    const rows = 3
    canvas.width = cols
    canvas.height = rows
    paintTrack(
      ctx,
      cols,
      rows,
      fillOf(color),
      fillOf("grey"),
      isRange ? toRatio(lo) : 0,
      toRatio(hi),
      variant,
      tickRatios,
      matrix,
    )
  }

  function clampStep(raw: number): number {
    const stepped = min + Math.round((raw - min) / step) * step
    return Math.min(max, Math.max(min, stepped))
  }

  function setThumb(which: 0 | 1, v: number) {
    if (!isRange) {
      onChange?.(clampStep(v))
      return
    }
    const [a, b] = value as [number, number]
    const clamped = clampStep(v)
    // Thumbs may meet but never cross.
    onChange?.(which === 0 ? [Math.min(clamped, b), b] : [a, Math.max(clamped, a)])
  }

  function valueFromClientX(clientX: number): number {
    const rect = rootRef.current!.getBoundingClientRect()
    const t = clamp01((clientX - rect.left) / Math.max(1, rect.width))
    return min + t * span
  }

  function nearestThumb(v: number): 0 | 1 {
    if (!isRange) return 1
    return Math.abs(v - lo) <= Math.abs(v - hi) ? 0 : 1
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return
    rootRef.current?.setPointerCapture(event.pointerId)
    const v = valueFromClientX(event.clientX)
    const which = nearestThumb(v)
    setActive(which)
    setThumb(which, v)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || active === -1) return
    if (!rootRef.current?.hasPointerCapture(event.pointerId)) return
    setThumb(active, valueFromClientX(event.clientX))
  }

  function onPointerUp() {
    setActive(-1)
  }

  function onKeydown(which: 0 | 1, event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    const current = which === 0 ? lo : hi
    let next: number
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = current - step
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = current + step
    else if (event.key === "Home") next = min
    else if (event.key === "End") next = max
    else return
    event.preventDefault()
    setThumb(which, next)
  }

  const thumbs = useMemo(() => {
    const list: { which: 0 | 1; value: number; min: number; max: number; name: string }[] = []
    if (isRange) {
      list.push({
        which: 0,
        value: lo,
        min,
        max: hi,
        name: label ? `${label} minimum` : "Minimum",
      })
      list.push({
        which: 1,
        value: hi,
        min: lo,
        max,
        name: label ? `${label} maximum` : "Maximum",
      })
    } else {
      list.push({ which: 1, value: hi, min, max, name: label ?? "" })
    }
    return list
  }, [isRange, lo, hi, min, max, label])

  // onMounted(rAF(paint+RO)) + watch(sources) → single effect.
  useEffect(() => {
    let ro: ResizeObserver | null = null
    const raf = requestAnimationFrame(() => {
      paint()
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(paint)
        if (rootRef.current) ro.observe(rootRef.current)
      }
    })
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [
    value,
    color,
    min,
    max,
    variant,
    ticks,
    matrix,
    tickRatios,
    isRange,
    lo,
    hi,
  ])

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative h-4 w-full touch-none select-none",
        disabled ? "pointer-events-none opacity-40" : "cursor-pointer",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 overflow-hidden rounded-[2px]">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      {thumbs.map((t) => (
        <div key={t.which}>
          <div
            role="slider"
            aria-label={t.name || undefined}
            tabIndex={disabled ? -1 : 0}
            aria-valuemin={t.min}
            aria-valuemax={t.max}
            aria-valuenow={t.value}
            aria-disabled={disabled || undefined}
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-foreground"
            style={{ left: `${toRatio(t.value) * 100}%` }}
            onKeyDown={(e) => onKeydown(t.which, e)}
            onFocus={() => setFocused(t.which)}
            onBlur={() => setFocused(-1)}
          />
          {showValue && (active === t.which || focused === t.which) ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px] tabular-nums text-foreground"
              style={{ left: `${toRatio(t.value) * 100}%` }}
            >
              {t.value}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
