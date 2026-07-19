"use client"

import { useEffect, useMemo, useRef, type KeyboardEvent } from "react"
import { cn } from "./lib"
import { fillOf, type PixelColor } from "./pixel"
import { paintToggleCanvas } from "./paint-toggle"
import type { Option } from "./DitherSelect"

// Port of DitherToggleGroup.vue. Array refs (`:ref` callback over v-for) →
// useRef<(T|null)[]> + ref callback (guide §7). Shared canvas paint via
// `paintToggleCanvas` (RasterBuffer + putRasterBuffer, per AGENTS.md).
// `paintAll()` is deferred via RAF to avoid forced reflow from
// getBoundingClientRect during mount (AGENTS.md — DitherToggleGroup defers
// paintAll() via RAF).

export interface DitherToggleGroupProps {
  options: Option[]
  value: string | string[]
  type?: "single" | "multiple"
  color?: PixelColor
  className?: string
  onChange?: (value: string | string[]) => void
}

export function DitherToggleGroup({
  options,
  value,
  type = "single",
  color = "blue",
  className,
  onChange,
}: DitherToggleGroupProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const paintRaf = useRef(0)

  function isOn(o: Option): boolean {
    return Array.isArray(value) ? value.includes(o.value) : value === o.value
  }

  const activeIndex = useMemo(() => {
    if (Array.isArray(value)) return 0
    const i = options.findIndex((o) => o.value === value)
    return i >= 0 ? i : 0
  }, [options, value])

  function pick(o: Option) {
    if (o.disabled) return
    if (type === "multiple") {
      const cur = Array.isArray(value) ? value : []
      onChange?.(cur.includes(o.value) ? cur.filter((v) => v !== o.value) : [...cur, o.value])
    } else {
      onChange?.(o.value)
    }
  }

  function paintAll() {
    const fill = fillOf(color)
    options.forEach((o, i) => {
      const btn = btnRefs.current[i]
      const canvas = canvasRefs.current[i]
      if (!btn || !canvas || !isOn(o)) return
      paintToggleCanvas(btn, canvas, fill)
    })
  }

  function schedulePaint() {
    if (paintRaf.current) return
    paintRaf.current = requestAnimationFrame(() => {
      paintRaf.current = 0
      paintAll()
    })
  }

  function onKeydown(e: KeyboardEvent<HTMLDivElement>) {
    if (type !== "single") return
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
        requestAnimationFrame(() => btnRefs.current[i]?.focus())
        return
      }
    }
  }

  // onMounted(RO + paintAll) + watch → single effect. RO repays via rAF too.
  useEffect(() => {
    let ro: ResizeObserver | null = null
    schedulePaint()
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => schedulePaint())
      if (rootRef.current) ro.observe(rootRef.current)
    }
    return () => {
      ro?.disconnect()
      if (paintRaf.current) cancelAnimationFrame(paintRaf.current)
    }
  }, [value, color, options])

  return (
    <div
      ref={rootRef}
      role={type === "single" ? "radiogroup" : "group"}
      className={cn("inline-flex gap-1 rounded-md border border-border/60 p-1", className)}
      onKeyDown={onKeydown}
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            btnRefs.current[i] = el
          }}
          type="button"
          role={type === "single" ? "radio" : undefined}
          aria-checked={type === "single" ? isOn(o) : undefined}
          aria-pressed={type === "multiple" ? isOn(o) : undefined}
          tabIndex={type === "single" ? (i === activeIndex ? 0 : -1) : undefined}
          disabled={o.disabled}
          className={cn(
            "relative isolate overflow-hidden rounded-md border px-2.5 py-1.5 font-mono text-[12px] transition-colors focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
            isOn(o)
              ? "border-transparent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          onClick={() => pick(o)}
        >
          <canvas
            hidden={!isOn(o)}
            ref={(el) => {
              canvasRefs.current[i] = el
            }}
            aria-hidden="true"
            className="absolute inset-0 -z-10 h-full w-full"
            style={{ imageRendering: "pixelated" }}
          />
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
