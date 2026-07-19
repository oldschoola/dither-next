"use client"

import { useCommonChart } from "./common-context"
import { cn } from "./lib"
import { rgb } from "./palette"

export interface LegendProps {
  /** Enable click-to-select interaction on legend entries. */
  isClickable?: boolean
  /** Horizontal alignment of the legend row. */
  align?: "left" | "center" | "right"
}

/**
 * Chart legend — a row of colour-swatched buttons, one per series/slice,
 * rendered in the DOM layer (absolutely positioned over the chart). Click
 * toggles selection; hover/focus spotlights one series (others dim).
 *
 * React port of `Legend.vue`. Sets `Legend.chartLayer = "dom"` so the chart
 * root routes it into the DOM layer (guide §8).
 */
export function Legend({ isClickable = false, align = "right" }: LegendProps) {
  const chart = useCommonChart()

  const dimmed = (name: string): boolean => {
    const emphasis = chart.selectedDataKey ?? chart.focusDataKey
    return emphasis !== null && emphasis !== name
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 flex flex-wrap gap-3 px-1",
        align === "right" && "justify-end",
        align === "center" && "justify-center",
        align === "left" && "justify-start"
      )}
    >
      {chart.names.map((name) => (
        <button
          key={name}
          type="button"
          disabled={!isClickable}
          className={cn(
            "flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-opacity",
            isClickable && "pointer-events-auto cursor-pointer hover:text-foreground",
            dimmed(name) && "opacity-40"
          )}
          onClick={() =>
            chart.selectDataKey(chart.selectedDataKey === name ? null : name)
          }
          onPointerEnter={() => chart.setFocusDataKey(name)}
          onPointerLeave={() => chart.setFocusDataKey(null)}
          onFocus={() => chart.setFocusDataKey(name)}
          onBlur={() => chart.setFocusDataKey(null)}
        >
          <span
            className="size-2 rounded-[1px]"
            style={{ backgroundColor: rgb(chart.seedOf(name).fill) }}
          />
          {chart.labelOf(name)}
        </button>
      ))}
    </div>
  )
}

/** Route into the DOM layer (absolutely positioned over the chart). */
Legend.chartLayer = "dom" as const
