"use client"

import { useEffect, useMemo, type ReactNode } from "react"
import {
  type SeriesKind,
  type SeriesSpec,
  type StrokeVariant,
  type VariantInput,
  useChartPart,
} from "./chart-context"
import { SeriesContext } from "./series-context"

export interface CartesianSeriesProps {
  /** Component name used in the boundary-guard error — e.g. "Area", "Line", "Bar". */
  part: string
  /** Which cartesian series kind this registers as. */
  kind: SeriesKind
  dataKey: string
  variant?: VariantInput
  strokeVariant?: StrokeVariant
  isClickable?: boolean
  opacity?: number
  children?: ReactNode
}

/**
 * The shared cartesian series host. Registers a {@link SeriesSpec} into the
 * chart context (so the canvas painter knows what to paint), provides a
 * {@link SeriesContext} for nested markers (`<Dot>`, `<ActiveDot>`), and
 * renders an optional transparent hit `<path>` when `isClickable`.
 *
 * React port of `CartesianSeries.vue`. The Vue version separated registration
 * (`watch(immediate)`) from unregistration (`onBeforeUnmount`); per the
 * conversion guide §2 these collapse into ONE effect that registers in its
 * body and unregisters in its cleanup.
 */
export function CartesianSeries({
  part,
  kind,
  dataKey,
  variant = "gradient",
  strokeVariant = "solid",
  isClickable = false,
  opacity = 1,
  children,
}: CartesianSeriesProps) {
  // Boundary guard: Area/Line register against the "area" root kind; Bar
  // against "bar". The Vue kit maps kind==="line" → "line", else "area".
  const ctx = useChartPart(part, kind === "line" ? "line" : "area")

  if (process.env.NODE_ENV !== "production" && !ctx.config[dataKey]) {
    // eslint-disable-next-line no-console
    console.warn(
      `<${part} dataKey="${dataKey}" />: "${dataKey}" is not in the chart \`config\`. Add it so the series has a colour and label.`
    )
  }

  // Register on mount / when the spec changes; unregister on unmount. This is
  // the canonical "register on mount, unregister on unmount" shape (guide §2).
  const { registerSeries, unregisterSeries } = ctx
  useEffect(() => {
    registerSeries({ dataKey, kind, variant, strokeVariant, opacity })
    return () => unregisterSeries(dataKey)
  }, [registerSeries, unregisterSeries, dataKey, kind, variant, strokeVariant, opacity])

  // The series surface for nested markers — getters read `ctx` fresh so
  // `seed`/`dimmed` reflect the latest selection state at render time.
  const seriesValue = useMemo(
    () => ({
      dataKey,
      get seed() {
        return ctx.seedOf(dataKey)
      },
      get dimmed() {
        const emphasis = ctx.selectedDataKey ?? ctx.focusDataKey
        return emphasis !== null && emphasis !== dataKey
      },
    }),
    [ctx, dataKey]
  )

  const band = ctx.bands[dataKey]
  const hitPath = useMemo(() => {
    if (!isClickable || !band) return null
    const parts: string[] = []
    band.forEach((pt, i) => {
      parts.push(`${i === 0 ? "M" : "L"}${ctx.xCenter(i)},${ctx.y(pt[1])}`)
    })
    for (let i = band.length - 1; i >= 0; i -= 1) {
      parts.push(`L${ctx.xCenter(i)},${ctx.y(band[i][0])}`)
    }
    return `${parts.join(" ")} Z`
  }, [isClickable, band, ctx])

  if (!ctx.ready || !band) return null

  const toggleSelect = () =>
    ctx.selectDataKey(ctx.selectedDataKey === dataKey ? null : dataKey)

  return (
    <SeriesContext.Provider value={seriesValue}>
      <g>
        {hitPath ? (
          <path
            d={hitPath}
            fill="transparent"
            style={{ cursor: "pointer" }}
            onClick={isClickable ? toggleSelect : undefined}
          />
        ) : null}
        {children}
      </g>
    </SeriesContext.Provider>
  )
}
