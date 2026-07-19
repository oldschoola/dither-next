import type { ReactNode } from "react"

// Port of DitherFieldset.vue — pure render wrapper (legend + grid slot).
// No state, so no "use client".

export interface DitherFieldsetProps {
  legend: string
  children?: ReactNode
}

export function DitherFieldset({ legend, children }: DitherFieldsetProps) {
  return (
    <fieldset className="rounded-lg border border-border/60 p-4">
      <legend className="px-1.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {legend}
      </legend>
      <div className="grid gap-4">{children}</div>
    </fieldset>
  )
}
