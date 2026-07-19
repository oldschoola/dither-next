"use client"

import { useEffect, useRef } from "react"
import { cn } from "./lib"
import { BAYER4, clamp01, fillOf } from "./pixel"
import { rgb, type DitherColor, type Rgb } from "./palette"

const CELL = 2

/** Paint the meter track — DitherProgress's determinate recipe, no motion.
 *  Ported verbatim from the Vue module-level `paintMeter`. */
function paintMeter(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  fill: Rgb,
  muted: Rgb,
  ratio: number,
  matrix: number[][] = BAYER4,
): void {
  ctx.clearRect(0, 0, cols, rows)
  const filled = Math.round(cols * clamp01(ratio))
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x < filled) {
        const density = 0.35 + 0.65 * ((x + 0.5) / Math.max(1, filled))
        const lit = density > matrix[y & 3][x & 3]
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

export interface DitherMeterProps {
  value: number
  min?: number
  max?: number
  low?: number
  high?: number
  className?: string
}

// Port of DitherMeter.vue. Canvas meter + zones. Vue `cols` was a mutable
// module-level `let` — in React it lives in a ref so the paint loop reads it
// without re-rendering. onMounted(rAF(resize+RO)) + watch → single effect.
export function DitherMeter({
  value,
  min = 0,
  max = 100,
  low = 0.5,
  high = 0.8,
  className,
}: DitherMeterProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // `cols` is read by `paint` and mutated by `resize`; a ref avoids
  // re-rendering on every resize tick.
  const colsRef = useRef(0)
  const rows = 3 // h-1.5 track at CELL=2

  const ratio = clamp01((value - min) / (max - min || 1))
  const zone: DitherColor =
    ratio < low ? "green" : ratio > high ? "red" : "orange"

  function paint() {
    const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true })
    if (!ctx || colsRef.current <= 0) return
    paintMeter(ctx, colsRef.current, rows, fillOf(zone), fillOf("grey"), ratio)
  }

  function resize() {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    colsRef.current = Math.max(4, Math.round(root.getBoundingClientRect().width / CELL))
    canvas.width = colsRef.current
    canvas.height = rows
    paint()
  }

  useEffect(() => {
    let ro: ResizeObserver | null = null
    const raf = requestAnimationFrame(() => {
      resize()
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(resize)
        if (rootRef.current) ro.observe(rootRef.current)
      }
    })
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [value, min, max, low, high, zone, ratio])

  return (
    <div
      ref={rootRef}
      role="meter"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
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
