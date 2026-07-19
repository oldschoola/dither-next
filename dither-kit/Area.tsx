"use client"

import type { ReactNode } from "react"
import {
  type StrokeVariant,
  type VariantInput,
} from "./chart-context"
import { CartesianSeries } from "./CartesianSeries"

export interface AreaProps {
  dataKey: string
  variant?: VariantInput
  strokeVariant?: StrokeVariant
  isClickable?: boolean
  opacity?: number
  children?: ReactNode
}

/**
 * Area series marker. Forwards to {@link CartesianSeries} with `kind="area"`.
 * The Vue `Area.vue` is a thin wrapper that spreads `$props` into
 * `CartesianSeries` and forwards its default `<slot/>`; this mirrors that.
 */
export function Area(props: AreaProps) {
  return (
    <CartesianSeries part="Area" kind="area" {...props}>
      {props.children}
    </CartesianSeries>
  )
}
