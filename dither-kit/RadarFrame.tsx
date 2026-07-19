"use client"

import { useMemo } from "react"
import { polarX, polarY } from "./polar"
import { usePolarChart } from "./polar-context"

/**
 * Radar back decoration — concentric rings + axis spokes + axis labels,
 * rendered in the `back` SVG layer (behind the dither canvas). The ring
 * count comes from the chart context so the root's `rings` prop drives it.
 *
 * React port of `RadarFrame.vue`. Takes no props (matches the Vue SFC, which
 * reads `ctx.rings` directly). Sets `RadarFrame.chartLayer = "back"` so the
 * polar root routes it behind the canvas (guide §8).
 */
export function RadarFrame() {
  const ctx = usePolarChart()
  // Ring count comes from the chart context so the root's `rings` prop drives it.
  const levels = Math.max(1, Math.round(ctx.rings))
  const axes = ctx.radar?.axes ?? []

  const rings = useMemo(
    () =>
      Array.from({ length: levels }, (_, l) => {
        const radius = (ctx.outerRadius * (l + 1)) / levels
        return (
          axes
            .map(
              (ax, i) =>
                `${i === 0 ? "M" : "L"}${polarX(ctx.center.x, radius, ax.angle).toFixed(1)},${polarY(ctx.center.y, radius, ax.angle).toFixed(1)}`
            )
            .join(" ") + " Z"
        )
      }),
    [levels, ctx.outerRadius, ctx.center.x, ctx.center.y, axes]
  )

  // Anchor text so labels sit outboard of their spoke.
  const anchorOf = (angle: number): "start" | "middle" | "end" => {
    if (Math.abs(Math.cos(angle)) < 0.3) return "middle"
    return Math.cos(angle) > 0 ? "start" : "end"
  }

  if (!ctx.ready || !ctx.radar) return null

  return (
    <g>
      <g className="stroke-border" fill="none">
        {rings.map((d, l) => (
          <path key={l} d={d} />
        ))}
        {axes.map((ax, i) => (
          <line
            key={ax.label}
            x1={ctx.center.x}
            y1={ctx.center.y}
            x2={polarX(ctx.center.x, ctx.outerRadius, ax.angle)}
            y2={polarY(ctx.center.y, ctx.outerRadius, ax.angle)}
            className={ctx.hoverIndex === i ? "stroke-foreground" : undefined}
          />
        ))}
      </g>
      <g className="font-mono text-[10px]">
        {axes.map((ax, i) => (
          <text
            key={ax.label}
            x={polarX(ctx.center.x, ctx.outerRadius + 10, ax.angle)}
            y={polarY(ctx.center.y, ctx.outerRadius + 10, ax.angle)}
            textAnchor={anchorOf(ax.angle)}
            dominantBaseline="central"
            className={ctx.hoverIndex === i ? "fill-foreground" : "fill-muted-foreground"}
          >
            {ax.label}
          </text>
        ))}
      </g>
    </g>
  )
}

/** Route into the back SVG layer (behind the dither canvas). */
RadarFrame.chartLayer = "back" as const
