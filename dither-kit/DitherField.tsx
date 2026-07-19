"use client"

import { useId, useMemo, type ReactNode } from "react"
import { FieldContext, type FieldContext as FieldContextValue } from "./control"
import { cssColor } from "./palette"

// Port of DitherField.vue. Supplies generated control/help IDs + error
// state to compatible descendants via FieldContext/useField. Explicit
// consumer `id`, `aria-describedby`, and `invalid` props win (the controls
// merge: their own prop ?? field.controlId).

export interface DitherFieldProps {
  label?: string
  description?: string
  error?: string
  /** Override the generated control id (maps to Vue's `for` prop name clash;
   *  Vue used `for` which is reserved in TS/JSX, so we expose `htmlFor`-style
   *  via `controlId` instead). When set, it becomes the field's controlId. */
  controlId?: string
  children?: ReactNode
}

export function DitherField({ label, description, error, controlId, children }: DitherFieldProps) {
  // SSR-stable unique base via useId (the Vue kit used a module-level counter,
  // which is not SSR-safe — server and client module instances diverge).
  const reactId = useId()
  const base = `dk-field-${reactId}`
  const id = controlId ?? `${base}-control`
  const helpId = `${base}-help`
  const describedBy = error || description ? helpId : undefined
  const invalid = !!error

  const ctx: FieldContextValue = useMemo(
    () => ({ controlId: id, describedBy, invalid }),
    [id, describedBy, invalid],
  )

  return (
    <FieldContext value={ctx}>
      <div className="grid gap-1.5">
        {label ? (
          <label htmlFor={id} className="text-[12px] font-medium text-foreground/90">
            {label}
          </label>
        ) : null}
        {children}
        {error ? (
          <p
            id={helpId}
            role="alert"
            className="flex items-center gap-1.5 text-[11px]"
            style={{ color: cssColor("red") }}
          >
            <span
              aria-hidden="true"
              className="inline-block size-1.5"
              style={{ background: cssColor("red") }}
            />
            {error}
          </p>
        ) : description ? (
          <p id={helpId} className="text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </FieldContext>
  )
}
