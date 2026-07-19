"use client"

import { useChartPart } from "./chart-context"

export interface YAxisProps {
  /** Custom tick label formatter. */
  tickFormatter?: (value: number) => string
  /** Number of ticks to render. */
  tickCount?: number
  /** px gap between the plot left edge and the tick label anchor. */
  tickMargin?: number
}

/**
 * Y axis — value tick labels to the left of the plot, anchored end/baseline
 * central. Rendered in the default front SVG layer.
 *
 * React port of `YAxis.vue`.
 */
export function YAxis({
  tickFormatter,
  tickCount = 4,
  tickMargin = 8,
}: YAxisProps) {
  const ctx = useChartPart("YAxis")

  if (!ctx.ready) return null

  const ticks = ctx.y.ticks(tickCount)

  return (
    <g className="fill-current font-mono text-[10px] text-muted-foreground">
      {ticks.map((t) => (
        <text
          key={t}
          x={-tickMargin}
          y={ctx.y(t)}
          textAnchor="end"
          dominantBaseline="central"
          fill="currentColor"
        >
          {tickFormatter ? tickFormatter(t) : t}
        </text>
      ))}
    </g>
  )
}
