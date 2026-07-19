"use client"

import { useEffect, useMemo, useRef, type KeyboardEvent } from "react"
import { cn } from "./lib"
import { fillOf, type PixelColor } from "./pixel"
import { rgb, type Rgb } from "./palette"
import { BAYER4, clamp01 } from "./pixel"
import type { Option } from "./DitherSelect"

const CELL = 2

/** Paint one radio — a 1px pixel ring when unchecked, the ring in the accent
 *  plus a dithered inner dot (distance check against the Bayer matrix) when
 *  checked. Ported verbatim from the Vue module-level `paintDot`. */
function paintDot(
  ctx: CanvasRenderingContext2D,
  n: number,
  fill: Rgb,
  muted: Rgb,
  checked: boolean,
  matrix: number[][] = BAYER4,
): void {
  ctx.clearRect(0, 0, n, n)
  const c = (n - 1) / 2
  const edge = n / 2
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - c, y - c)
      if (d > edge) continue
      if (d > edge - 1.2) {
        ctx.fillStyle = rgb(checked ? fill : muted, 1, 0.6)
        ctx.fillRect(x, y, 1, 1)
      } else if (checked && d <= edge - 2.4) {
        const density = 0.8
        const lit = density > matrix[y & 3][x & 3]
        const k = 0.3 + density * 0.7
        ctx.fillStyle = rgb(fill, 1, clamp01(lit ? k : k * 0.4))
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
}

export interface DitherRadioGroupProps {
  options: Option[]
  value: string
  color?: PixelColor
  label?: string
  className?: string
  onChange?: (value: string) => void
}

// Port of DitherRadioGroup.vue. Array refs (`:ref` callback over v-for) →
// useRef<(T|null)[]> + ref callback (guide §7). Per-option `willReadFrequently`
// canvas. Keyboard nav emits + focuses the next enabled option.
export function DitherRadioGroup({
  options,
  value,
  color = "blue",
  label,
  className,
  onChange,
}: DitherRadioGroupProps) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])

  const activeIndex = useMemo(() => {
    const i = options.findIndex((o) => o.value === value)
    return i >= 0 ? i : 0
  }, [options, value])

  function paintAll() {
    const fill = fillOf(color)
    const muted = fillOf("grey")
    options.forEach((o, i) => {
      const canvas = canvasRefs.current[i]
      const ctx = canvas?.getContext("2d", { willReadFrequently: true })
      if (!canvas || !ctx) return
      const n = Math.max(4, Math.round(canvas.getBoundingClientRect().width / CELL))
      canvas.width = n
      canvas.height = n
      paintDot(ctx, n, fill, muted, o.value === value)
    })
  }

  function onKeydown(e: KeyboardEvent<HTMLDivElement>) {
    const dir =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -1
          : 0
    if (!dir) return
    e.preventDefault()
    const n = options.length
    let i = activeIndex
    for (let step = 0; step < n; step++) {
      i = (i + dir + n) % n
      if (!options[i].disabled) {
        onChange?.(options[i].value)
        // Vue nextTick(focus) → focus in the same tick after the parent
        // re-renders; we defer to the next frame so the button is mounted.
        requestAnimationFrame(() => btnRefs.current[i]?.focus())
        return
      }
    }
  }

  // onMounted(requestAnimationFrame(paintAll)) + watch → single effect. The
  // Vue `nextTick(paintAll)` on watch becomes a rAF so the new option set
  // has rendered before we measure the canvases.
  useEffect(() => {
    const raf = requestAnimationFrame(paintAll)
    return () => cancelAnimationFrame(raf)
  }, [value, color, options])

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid gap-3", className)}
      onKeyDown={onKeydown}
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            btnRefs.current[i] = el
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={i === activeIndex ? 0 : -1}
          disabled={o.disabled}
          className="inline-flex items-center gap-2 text-left focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
          onClick={() => onChange?.(o.value)}
        >
          <span className="relative size-4 shrink-0">
            <canvas
              ref={(el) => {
                canvasRefs.current[i] = el
              }}
              aria-hidden="true"
              className="absolute inset-0 h-full w-full"
              style={{ imageRendering: "pixelated" }}
            />
          </span>
          <span className="text-[13px] text-foreground">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
