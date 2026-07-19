"use client"

import { useEffect } from "react"
import type { VariantInput } from "./chart-context"
import { usePolarPart } from "./polar-context"

export interface RadarProps {
  dataKey: string
  variant?: VariantInput
}

/**
 * Radar series marker. The dithered polygon is painted on the canvas; this
 * registers the per-series variant into the polar chart context.
 * Renders an empty `<g/>` so it participates in the layer tree without
 * emitting any visible SVG.
 *
 * React port of `Radar.vue`. Registration + unregistration collapse into one
 * effect (guide §2).
 */
export function Radar({ dataKey, variant = "gradient" }: RadarProps) {
  const ctx = usePolarPart("Radar", "radar")

  if (process.env.NODE_ENV !== "production" && !ctx.config[dataKey]) {
    // eslint-disable-next-line no-console
    console.warn(
      `<Radar dataKey="${dataKey}" />: "${dataKey}" is not in the chart \`config\`. Add it so the series has a colour and label.`
    )
  }

  const { registerVariant, unregisterVariant } = ctx
  useEffect(() => {
    registerVariant(dataKey, variant)
    return () => unregisterVariant(dataKey)
  }, [registerVariant, unregisterVariant, dataKey, variant])

  return <g />
}
