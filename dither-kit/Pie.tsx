"use client"

import { useEffect } from "react"
import type { VariantInput } from "./chart-context"
import { usePolarPart } from "./polar-context"

export interface PieProps {
  variant?: VariantInput
}

/**
 * Pie series marker. Slices are painted on the canvas; this part only
 * registers the variant into the polar chart context under the wildcard
 * `"*"` key (the pie canvas reads the global variant, not a per-series one).
 * Renders an empty `<g/>` so it participates in the layer tree without
 * emitting any visible SVG.
 *
 * React port of `Pie.vue`. Registration + unregistration collapse into one
 * effect (guide §2).
 */
export function Pie({ variant = "gradient" }: PieProps) {
  const ctx = usePolarPart("Pie", "pie")

  const { registerVariant, unregisterVariant } = ctx
  useEffect(() => {
    registerVariant("*", variant)
    return () => unregisterVariant("*")
  }, [registerVariant, unregisterVariant, variant])

  return <g />
}
