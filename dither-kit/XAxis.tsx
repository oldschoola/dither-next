"use client"

import { useMemo } from "react"
import { useChartPart } from "./chart-context"

export interface XAxisProps {
  /** Data key whose value labels each tick (e.g. `"month"`). Falls back to the
   *  data index when omitted. */
  dataKey?: string
  /** Custom tick label formatter. */
  tickFormatter?: (value: unknown, index: number) => string
  /** px gap between the plot bottom and the tick label baseline. */
  tickMargin?: number
  /** Max tick labels before decimation kicks in. */
  maxTicks?: number
}

/**
 * X axis — tick labels under the plot, one per data index (decimated by
 * `maxTicks`). Rendered in the default front SVG layer.
 *
 * React port of `XAxis.vue`.
 */
export function XAxis({
  dataKey,
  tickFormatter,
  tickMargin = 8,
  maxTicks = 8,
}: XAxisProps) {
  const ctx = useChartPart("XAxis")

  const step = useMemo(
    () => Math.max(1, Math.ceil(ctx.dataLength / maxTicks)),
    [ctx.dataLength, maxTicks]
  )

  if (!ctx.ready) return null

  return (
    <g className="fill-current font-mono text-[10px] text-muted-foreground">
      {ctx.data.map((row, i) => {
        if (i % step !== 0) return null
        const raw = dataKey ? row[dataKey] : i
        const label = tickFormatter ? tickFormatter(raw, i) : String(raw ?? "")
        return (
          <text
            key={i}
            x={ctx.xCenter(i) ?? 0}
            y={ctx.plot.height + tickMargin}
            textAnchor="middle"
            dominantBaseline="hanging"
            fill="currentColor"
          >
            {label}
          </text>
        )
      })}
    </g>
  )
}
