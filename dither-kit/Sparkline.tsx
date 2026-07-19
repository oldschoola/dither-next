"use client"

import { useMemo } from "react"
import { AreaChart } from "./area-chart"
import { Area } from "./Area"
import type { VariantInput } from "./chart-context"
import type { BloomInput } from "./dither-paint"
import type { DitherColor } from "./palette"

export interface SparklineProps {
  /** Plain numeric series — the common sparkline case. */
  data: number[]
  color: DitherColor
  variant?: VariantInput
  seed?: number
  markerIndex?: number | null
  hovered?: boolean
  bloom?: BloomInput
  bloomOnHover?: boolean
  animate?: boolean
  /** Tailwind class merge — mirrors the Vue `class` prop (guide §1). */
  class?: string
}

/**
 * A tiny area chart with zero margins and a single `<Area>` series — the
 * sparkline building block. Composes `<AreaChart>` + `<Area>` to prove the
 * chart API works as a building block, not just an end component.
 *
 * React port of `Sparkline.vue`.
 */
export function Sparkline({
  data,
  color,
  variant = "gradient",
  seed,
  markerIndex = null,
  hovered = false,
  bloom = "off",
  bloomOnHover = false,
  animate = false,
  class: className,
}: SparklineProps) {
  const rows = useMemo(() => data.map((v) => ({ v })), [data])
  const config = useMemo(() => ({ v: { color } }), [color])

  return (
    <AreaChart
      data={rows}
      config={config}
      interactive={false}
      animate={animate}
      seed={seed}
      markerIndex={markerIndex}
      hovered={hovered}
      bloom={bloom}
      bloomOnHover={bloomOnHover}
      margins={{ top: 0, right: 0, bottom: 0, left: 0 }}
      className={className}
    >
      <Area dataKey="v" variant={variant} />
    </AreaChart>
  )
}
