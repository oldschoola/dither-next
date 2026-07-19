"use client"

import { useMemo, type CSSProperties, type InputHTMLAttributes } from "react"
import { CONTROL, useField } from "./control"
import { cn } from "./lib"
import { cssColor } from "./palette"

// Port of DitherInput.vue. Vue used `defineOptions({ inheritAttrs: false })`
// + `v-bind="$attrs"`; in React, rest-prop spread is the default behavior —
// we destructure the known props and spread `...rest` onto the <input>.
// Explicit consumer `id` / `aria-describedby` / `invalid` win over the
// DitherField context values (guide §5, DitherField contract).

export interface DitherInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "defaultValue" | "type" | "placeholder" | "disabled" | "readOnly"
  > {
  value?: string
  onChange?: (value: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  invalid?: boolean
  class?: string
}

export function DitherInput({
  value = "",
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  readOnly = false,
  invalid: invalidProp,
  class: className,
  id,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: DitherInputProps) {
  const field = useField()
  const invalid = useMemo(
    () => invalidProp || field?.invalid || false,
    [invalidProp, field?.invalid],
  )
  const resolvedId = id ?? field?.controlId
  const resolvedDescribedBy = ariaDescribedBy ?? field?.describedBy
  const style: CSSProperties | undefined = invalid
    ? { borderColor: cssColor("red") }
    : undefined

  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      id={resolvedId}
      disabled={disabled}
      readOnly={readOnly}
      aria-invalid={invalid || undefined}
      aria-describedby={resolvedDescribedBy}
      style={style}
      className={cn(
        CONTROL,
        "w-full read-only:cursor-default read-only:bg-card/40 read-only:text-muted-foreground",
        className,
      )}
      onChange={(e) => onChange?.(e.currentTarget.value)}
      {...rest}
    />
  )
}
