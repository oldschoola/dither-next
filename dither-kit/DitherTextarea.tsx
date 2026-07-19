"use client"

import { useMemo, type CSSProperties, type TextareaHTMLAttributes } from "react"
import { CONTROL, useField } from "./control"
import { cn } from "./lib"
import { cssColor } from "./palette"

// Port of DitherTextarea.vue. Same shape as DitherInput: inheritAttrs:false
// + v-bind="$attrs" → rest spread; explicit id/aria-describedby/invalid win.

export interface DitherTextareaProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange" | "defaultValue" | "placeholder" | "rows" | "disabled" | "readOnly"
  > {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  rows?: number
  resize?: "none" | "vertical" | "horizontal" | "both"
  disabled?: boolean
  readOnly?: boolean
  invalid?: boolean
  class?: string
}

export function DitherTextarea({
  value = "",
  onChange,
  placeholder,
  rows = 4,
  resize = "vertical",
  disabled = false,
  readOnly = false,
  invalid: invalidProp,
  class: className,
  id,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: DitherTextareaProps) {
  const field = useField()
  const invalid = useMemo(
    () => invalidProp || field?.invalid || false,
    [invalidProp, field?.invalid],
  )
  const resolvedId = id ?? field?.controlId
  const resolvedDescribedBy = ariaDescribedBy ?? field?.describedBy
  const style: CSSProperties = {
    resize,
    ...(invalid ? { borderColor: cssColor("red") } : {}),
  }

  return (
    <textarea
      id={resolvedId}
      value={value}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      readOnly={readOnly}
      aria-invalid={invalid || undefined}
      aria-describedby={resolvedDescribedBy}
      style={style}
      className={cn(
        CONTROL,
        "block w-full leading-relaxed read-only:cursor-default read-only:bg-card/40 read-only:text-muted-foreground",
        className,
      )}
      onChange={(e) => onChange?.(e.currentTarget.value)}
      {...rest}
    />
  )
}
