"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CONTROL_BUTTON } from "./control"
import { cn } from "./lib"
import { kitFromSeed } from "./dither-paint"
import { BAYER4, clamp01, fillOf, pixelMatrixFromSeed, pixelPrefersReducedMotion, type PixelColor } from "./pixel"
import { rgb, type Rgb } from "./palette"

const CELL = 2

/** Paint the switch track — dithered gradient in the accent when on, a
 *  near-invisible muted wash when off. Ported verbatim from the Vue SFC's
 *  module-level `paintTrack`. */
function paintTrack(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  fill: Rgb,
  muted: Rgb,
  on: boolean,
  matrix: number[][] = BAYER4,
): void {
  ctx.clearRect(0, 0, cols, rows)
  for (let y = 0; y < rows; y++) {
    const density = on ? 0.25 + 0.75 * ((y + 0.5) / rows) : 0.2
    for (let x = 0; x < cols; x++) {
      const lit = density > matrix[y & 3][x & 3]
      if (on) {
        const k = 0.3 + density * 0.7
        ctx.fillStyle = rgb(fill, 1, clamp01(lit ? k : k * 0.4))
      } else {
        ctx.fillStyle = rgb(muted, 1, lit ? 0.18 : 0.06)
      }
      ctx.fillRect(x, y, 1, 1)
    }
  }
}

export interface DitherSwitchProps {
  value: boolean
  /** Accessible name — required for screen readers, the control has no text. */
  label?: string
  color?: PixelColor
  seed?: number
  disabled?: boolean
  class?: string
  onChange?: (value: boolean) => void
}

// Port of DitherSwitch.vue. Canvas dither track + CSS thumb transition.
// Vue `onMounted` + `watch` → a single useEffect with cleanup that paints on
// mount and whenever value/color/matrix change (guide §2). RAF defers the
// initial getBoundingClientRect (guide §9 rule 4).
export function DitherSwitch({
  value,
  label,
  color: colorProp,
  seed,
  disabled = false,
  class: className,
  onChange,
}: DitherSwitchProps) {
  const trackRef = useRef<HTMLSpanElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [reduce, setReduce] = useState(false)

  const s = useMemo(() => (seed !== undefined ? kitFromSeed(seed) : null), [seed])
  const color = useMemo<PixelColor>(() => colorProp ?? s?.hue ?? "blue", [colorProp, s])
  const matrix = useMemo(() => (seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4), [seed])

  function paint() {
    const track = trackRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { willReadFrequently: true })
    if (!track || !canvas || !ctx) return
    const box = track.getBoundingClientRect()
    const cols = Math.max(4, Math.round(box.width / CELL))
    const rows = Math.max(4, Math.round(box.height / CELL))
    canvas.width = cols
    canvas.height = rows
    paintTrack(ctx, cols, rows, fillOf(color), fillOf("grey"), value, matrix)
  }

  // onMounted + watch([value, color, matrix]) → paint. Mount defers to RAF.
  useEffect(() => {
    setReduce(pixelPrefersReducedMotion())
    const raf = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf)
  }, [value, color, matrix])

  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={value}
      disabled={disabled}
      className={cn(
        CONTROL_BUTTON,
        "relative inline-flex size-10 shrink-0 items-center justify-center rounded-md",
        className,
      )}
      onClick={() => onChange?.(!value)}
    >
      <span
        ref={trackRef}
        className="relative inline-flex h-5 w-9 items-center overflow-hidden rounded-[3px]"
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: "pixelated" }}
        />
        <span
          className={cn(
            "relative size-3.5 rounded-[2px] bg-foreground",
            value ? "translate-x-[19px]" : "translate-x-[3px]",
            reduce ? "" : "transition-transform duration-150",
          )}
        />
      </span>
    </button>
  )
}
