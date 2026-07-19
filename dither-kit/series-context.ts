"use client"

import { createContext, useContext } from "react"
import type { Seed } from "./palette"

/** Live series surface for markers — `seed`/`dimmed` reflect the current
 *  selection state at render time. */
export type SeriesContextValue = {
  dataKey: string
  seed: Seed
  dimmed: boolean
}

export const SeriesContext = createContext<SeriesContextValue | null>(null)

/** Boundary guard for series-scoped markers (`<Dot>`, `<ActiveDot>`). */
export function useSeries(part: string): SeriesContextValue {
  const ctx = useContext(SeriesContext)
  if (!ctx) {
    throw new Error(
      `<${part} /> must be rendered inside a series (e.g. <Area />).`
    )
  }
  return ctx
}
