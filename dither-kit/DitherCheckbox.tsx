"use client"

import { useEffect, useMemo, useRef } from "react"
import { CONTROL_BUTTON } from "./control"
import { cn } from "./lib"
import { kitFromSeed } from "./dither-paint"
import { BAYER4, clamp01, fillOf, pixelMatrixFromSeed, type PixelColor } from "./pixel"
import { rgb, type Rgb } from "./palette"
import type { ReactNode } from "react"

const CELL = 2

// Chunky pixel checkmark on the 8x8 cell grid (size-4 box at CELL=2).
const MARK: Array<[number, number]> = [
  [1, 3], [1, 4],
  [2, 4], [2, 5],
  [3, 5], [3, 6],
  [4, 4], [4, 5],
  [5, 3], [5, 4],
  [6, 2], [6, 3],
]

/** Paint the checkbox — a 1px border when unchecked, a dithered fill with a
 *  near-white pixel checkmark when checked. Ported verbatim from the Vue
 *  module-level `paintBox`. */
function paintBox(
  ctx: CanvasRenderingContext2D,
  n: number,
  fill: Rgb,
  muted: Rgb,
  checked: boolean,
  matrix: number[][] = BAYER4,
): void {
  ctx.clearRect(0, 0, n, n)
  if (!checked) {
    ctx.fillStyle = rgb(muted, 1, 0.6)
    ctx.fillRect(0, 0, n, 1)
    ctx.fillRect(0, n - 1, n, 1)
    ctx.fillRect(0, 0, 1, n)
    ctx.fillRect(n - 1, 0, 1, n)
    return
  }
  const density = 0.8
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const lit = density > matrix[y & 3][x & 3]
      const k = 0.3 + density * 0.7
      ctx.fillStyle = rgb(fill, 1, clamp01(lit ? k : k * 0.4))
      ctx.fillRect(x, y, 1, 1)
    }
  }
  ctx.fillStyle = "rgba(245,245,248,0.95)"
  for (const [x, y] of MARK) ctx.fillRect(x, y, 1, 1)
}

export interface DitherCheckboxProps {
  value: boolean
  color?: PixelColor
  seed?: number
  disabled?: boolean
  className?: string
  onChange?: (value: boolean) => void
  children?: ReactNode
}

// Port of DitherCheckbox.vue. Canvas checkmark dither. Vue `v-show` on the
// canvas is replaced by always-mounted canvas + a `paint` that renders the
// unchecked border (guide §5 — prefer keeping the element mounted). Mount
// defers the initial getBoundingClientRect to RAF (guide §9 rule 4).
export function DitherCheckbox({
  value,
  color: colorProp,
  seed,
  disabled = false,
  className,
  onChange,
  children,
}: DitherCheckboxProps) {
  const boxRef = useRef<HTMLSpanElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const s = useMemo(() => (seed !== undefined ? kitFromSeed(seed) : null), [seed])
  const color = useMemo<PixelColor>(() => colorProp ?? s?.hue ?? "blue", [colorProp, s])
  const matrix = useMemo(() => (seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4), [seed])

  function paint() {
    const box = boxRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { willReadFrequently: true })
    if (!box || !canvas || !ctx) return
    const n = Math.max(4, Math.round(box.getBoundingClientRect().width / CELL))
    canvas.width = n
    canvas.height = n
    paintBox(ctx, n, fillOf(color), fillOf("grey"), value, matrix)
  }

  useEffect(() => {
    const raf = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(raf)
  }, [value, color, matrix])

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={value}
      disabled={disabled}
      className={cn(
        CONTROL_BUTTON,
        "relative inline-flex min-h-10 items-center gap-2 text-left",
        className,
      )}
      onClick={() => onChange?.(!value)}
    >
      <span ref={boxRef} className="relative size-4 shrink-0">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: "pixelated" }}
        />
      </span>
      <span className="text-[13px] text-foreground">{children}</span>
    </button>
  )
}
