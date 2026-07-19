"use client"

import { useMemo } from "react"
import { useChart } from "./chart-context"
import { dotPaint, type DotVariant } from "./dot-paint"
import { useSeries } from "./series-context"

export interface DotProps {
  /** Visual style of the marker. */
  variant?: DotVariant
  /** Circle radius in plot px. */
  r?: number
}

/**
 * Series dots — one circle per data index on the series' value line, fading
 * in once the entrance reveal completes. Rendered inside a series' slot
 * (consumes {@link useSeries} for the data key + seed).
 *
 * React port of `Dot.vue`.
 */
export function Dot({ variant = "border", r = 2 }: DotProps) {
  const ctx = useChart()
  const series = useSeries("Dot")
  const band = ctx.bands[series.dataKey]
  const paint = useMemo(
    () => dotPaint(variant, series.seed),
    [variant, series.seed]
  )

  if (!ctx.ready || !band) return null

  return (
    <g
      style={{
        opacity: ctx.entranceDone ? 1 : 0,
        transition: "opacity 300ms ease",
      }}
    >
      {band.map((b, i) => (
        <circle
          key={i}
          fill={paint.fill}
          stroke={paint.stroke}
          strokeWidth={paint.strokeWidth}
          cx={ctx.xCenter(i) ?? 0}
          cy={ctx.y(b[1])}
          r={r}
        />
      ))}
    </g>
  )
}
