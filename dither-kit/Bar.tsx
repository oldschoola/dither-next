"use client"

import { useEffect, useMemo, type ReactNode } from "react"
import {
  type SeriesSpec,
  type StrokeVariant,
  type VariantInput,
  useChartPart,
} from "./chart-context"
import { SeriesContext } from "./series-context"

export interface BarProps {
  dataKey: string
  variant?: VariantInput
  strokeVariant?: StrokeVariant
  isClickable?: boolean
  opacity?: number
  children?: ReactNode
}

/**
 * Bar series marker — registers a `kind: "bar"` {@link SeriesSpec} and renders
 * a transparent hit `<rect>` per data index when `isClickable`.
 *
 * React port of `Bar.vue`. Unlike `<Area>`/`<Line>` it does NOT delegate to
 * `CartesianSeries` (the Vue SFC carries its own rect geometry because bars
 * are per-index bands, not a single closed path). Registration + unregistration
 * collapse into one effect per guide §2; the provided `SeriesContext` mirrors
 * the Vue getter facade so `<Dot>`/`<ActiveDot>` read live selection state.
 */
export function Bar({
  dataKey,
  variant = "gradient",
  strokeVariant = "solid",
  isClickable = false,
  opacity = 1,
  children,
}: BarProps) {
  const ctx = useChartPart("Bar", "bar")

  if (process.env.NODE_ENV !== "production" && !ctx.config[dataKey]) {
    // eslint-disable-next-line no-console
    console.warn(
      `<Bar dataKey="${dataKey}" />: "${dataKey}" is not in the chart \`config\`. Add it so the series has a colour and label.`
    )
  }

  const { registerSeries, unregisterSeries } = ctx
  useEffect(() => {
    registerSeries({ dataKey, kind: "bar", variant, strokeVariant, opacity })
    return () => unregisterSeries(dataKey)
  }, [registerSeries, unregisterSeries, dataKey, variant, strokeVariant, opacity])

  // Bar dims when *any* other series is selected (not focus-hover — the Vue
  // kit only checks `selectedDataKey` here, unlike Area/Line which also fold
  // in `focusDataKey`).
  const seriesValue = useMemo(
    () => ({
      dataKey,
      get seed() {
        return ctx.seedOf(dataKey)
      },
      get dimmed() {
        return ctx.selectedDataKey !== null && ctx.selectedDataKey !== dataKey
      },
    }),
    [ctx, dataKey]
  )

  const band = ctx.bands[dataKey]
  const si = ctx.configKeys.indexOf(dataKey)
  const rects = useMemo(() => {
    if (!isClickable || !band) return []
    const n = ctx.configKeys.length
    return band.map((b, i) => {
      const slot = ctx.barSlot(i, si, n)
      const top = ctx.y(b[1])
      const base = ctx.y(b[0])
      return {
        x: slot.x,
        y: Math.min(top, base),
        width: slot.width,
        height: Math.abs(base - top),
      }
    })
  }, [isClickable, band, ctx, si])

  const toggleSelect = () =>
    ctx.selectDataKey(ctx.selectedDataKey === dataKey ? null : dataKey)

  if (!ctx.ready || !band) return null

  return (
    <SeriesContext.Provider value={seriesValue}>
      <g>
        {isClickable &&
          rects.map((r, i) => (
            <rect
              key={i}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onClick={toggleSelect}
            />
          ))}
        {children}
      </g>
    </SeriesContext.Provider>
  )
}
