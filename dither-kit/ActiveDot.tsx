"use client"

import { useMemo } from "react"
import { useChart } from "./chart-context"
import { dotPaint, type DotVariant } from "./dot-paint"
import { rgb } from "./palette"
import { useSeries } from "./series-context"

export interface ActiveDotProps {
  /** Visual style of the marker. */
  variant?: DotVariant
  /** Inner circle radius in plot px. A halo at `r + 3` sits behind it. */
  r?: number
}

/**
 * The active hover marker — a halo'd dot at the currently hovered index,
 * shown only after the entrance reveal is done. Rendered inside a series'
 * slot (consumes {@link useSeries} for the data key + seed).
 *
 * React port of `ActiveDot.vue`.
 */
export function ActiveDot({ variant = "colored-border", r = 3 }: ActiveDotProps) {
  const ctx = useChart()
  const series = useSeries("ActiveDot")
  const band = ctx.bands[series.dataKey]

  const point = useMemo(() => {
    if (!ctx.ready || !band || ctx.hoverIndex == null || !ctx.entranceDone) {
      return null
    }
    const b = band[ctx.hoverIndex]
    if (!b) return null
    return { cx: ctx.xCenter(ctx.hoverIndex), cy: ctx.y(b[1]) }
  }, [ctx.ready, ctx.hoverIndex, ctx.entranceDone, band, ctx])

  const paint = useMemo(
    () => dotPaint(variant, series.seed),
    [variant, series.seed]
  )
  const halo = useMemo(() => rgb(series.seed.line, 1, 0.18), [series.seed.line])

  if (!point) return null

  return (
    <g>
      <circle cx={point.cx} cy={point.cy} r={r + 3} fill={halo} />
      <circle
        cx={point.cx}
        cy={point.cy}
        r={r}
        fill={paint.fill}
        stroke={paint.stroke}
        strokeWidth={2}
      />
    </g>
  )
}
