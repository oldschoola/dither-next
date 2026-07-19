"use client"

import { useEffect, useMemo, useRef, type ReactNode } from "react"
import { cn } from "./lib"
import { fillOf, pixelMatrixFromSeed, BAYER4, type PixelColor } from "./pixel"
import { kitFromSeed } from "./dither-paint"
import { paintToggleCanvas } from "./paint-toggle"

// Port of DitherToggle.vue. Canvas dither fill behind the pressed label,
// painted through the shared RasterBuffer-based `paintToggleCanvas`
// (dither-kit/AGENTS.md: DitherToggle + DitherToggleGroup share it, and it
// MUST use RasterBuffer + putRasterBuffer, not per-pixel fillRect). Vue
// `v-show` on the canvas → always-mounted canvas (paint is a no-op while
// off, the checked state is shown via the border/text classes). RAF
// deferral of the initial getBoundingClientRect + ResizeObserver repainting.

export interface DitherToggleProps {
  value: boolean
  color?: PixelColor
  seed?: number
  disabled?: boolean
  class?: string
  onChange?: (value: boolean) => void
  children?: ReactNode
}

export function DitherToggle({
  value,
  color: colorProp,
  seed,
  disabled = false,
  class: className,
  onChange,
  children,
}: DitherToggleProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const paintRaf = useRef(0)

  const s = useMemo(() => (seed !== undefined ? kitFromSeed(seed) : null), [seed])
  const color = useMemo<PixelColor>(() => colorProp ?? s?.hue ?? "blue", [colorProp, s])
  const matrix = useMemo(() => (seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4), [seed])

  function paint() {
    if (!value) return
    if (buttonRef.current && canvasRef.current)
      paintToggleCanvas(buttonRef.current, canvasRef.current, fillOf(color), matrix)
  }

  function deferredPaint() {
    if (paintRaf.current) return
    paintRaf.current = requestAnimationFrame(() => {
      paintRaf.current = 0
      paint()
    })
  }

  // onMounted(RO or paint) + watch([value, color, matrix]) → single effect.
  useEffect(() => {
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined" && buttonRef.current) {
      ro = new ResizeObserver(deferredPaint)
      ro.observe(buttonRef.current)
    } else {
      deferredPaint()
    }
    deferredPaint()
    return () => {
      ro?.disconnect()
      if (paintRaf.current) cancelAnimationFrame(paintRaf.current)
    }
  }, [value, color, matrix])

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-pressed={value}
      disabled={disabled}
      className={cn(
        "relative isolate overflow-hidden rounded-md border px-2.5 py-1.5 font-mono text-[12px] transition-colors focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
        value
          ? "border-transparent text-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={() => onChange?.(!value)}
    >
      <canvas
        hidden={!value}
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
      <span className="relative">{children}</span>
    </button>
  )
}
