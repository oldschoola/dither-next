"use client"

import { createContext, useContext } from "react"

export const CONTROL = "min-h-10 rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-[13px] text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/60 hover:border-foreground/25 focus-visible:border-accent/70 focus-visible:ring-2 focus-visible:ring-accent/20 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none"
export const CONTROL_BUTTON = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40"
export const POPOVER = "rounded-lg border border-border/80 bg-card shadow-[0_8px_24px_rgba(0,0,0,0.32)]"

export type FieldContext = {
  controlId: string
  describedBy: string | undefined
  invalid: boolean
}

export const FieldContext = createContext<FieldContext | null>(null)

/** Read the nearest `<DitherField>` context. Returns `null` when none is present
 *  so a control can stand alone (explicit `id`/`aria-describedby`/`invalid`
 *  props from the consumer win). */
export function useField(): FieldContext | null {
  return useContext(FieldContext)
}
