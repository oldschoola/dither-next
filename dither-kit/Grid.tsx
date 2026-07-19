"use client"

import { useChartPart } from "./chart-context"

export interface GridProps {
  horizontal?: boolean
  vertical?: boolean
  strokeDasharray?: string
  tickCount?: number
}

/**
 * Chart grid — horizontal and/or vertical dithered rule lines, rendered in the
 * `back` SVG layer (behind the dither canvas). Horizontal lines follow the
 * y-scale ticks; vertical lines follow the data index centers.
 *
 * React port of `Grid.vue`. Sets `Grid.chartLayer = "back"` so the cartesian
 * root routes it behind the canvas (guide §8).
 */
export function Grid({
  horizontal = true,
  vertical = false,
  strokeDasharray = "3 3",
  tickCount = 4,
}: GridProps) {
  const ctx = useChartPart("Grid")

  if (!ctx.ready) return null

  const yTicks = ctx.y.ticks(tickCount)

  return (
    <g className="stroke-border" strokeDasharray={strokeDasharray}>
      {horizontal &&
        yTicks.map((t) => (
          <line
            key={`h-${t}`}
            x1={0}
            x2={ctx.plot.width}
            y1={ctx.y(t)}
            y2={ctx.y(t)}
          />
        ))}
      {vertical &&
        ctx.data.map((_, i) => (
          <line
            key={`v-${i}`}
            x1={ctx.xCenter(i) ?? 0}
            x2={ctx.xCenter(i) ?? 0}
            y1={0}
            y2={ctx.plot.height}
          />
        ))}
    </g>
  )
}

/** Route into the back SVG layer (behind the dither canvas). */
Grid.chartLayer = "back" as const
