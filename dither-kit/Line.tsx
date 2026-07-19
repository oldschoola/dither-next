"use client"

import type { ReactNode } from "react"
import {
  type StrokeVariant,
  type VariantInput,
} from "./chart-context"
import { CartesianSeries } from "./CartesianSeries"

export interface LineProps {
  dataKey: string
  variant?: VariantInput
  strokeVariant?: StrokeVariant
  isClickable?: boolean
  opacity?: number
  children?: ReactNode
}

/**
 * Line series marker. Forwards to {@link CartesianSeries} with `kind="line"`.
 * The Vue `Line.vue` is a thin wrapper that spreads `$props` into
 * `CartesianSeries` and forwards its default `<slot/>`; this mirrors that.
 */
export function Line(props: LineProps) {
  return (
    <CartesianSeries part="Line" kind="line" {...props}>
      {props.children}
    </CartesianSeries>
  )
}
