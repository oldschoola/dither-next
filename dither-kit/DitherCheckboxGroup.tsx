"use client"

import { DitherCheckbox } from "./DitherCheckbox"
import { cn } from "./lib"
import type { PixelColor } from "./pixel"
import type { Option } from "./DitherSelect"

// Port of DitherCheckboxGroup.vue. Thin wrapper: value is string[] and the
// group toggles membership. v-model: modelValue + update:modelValue →
// value (string[]) + onChange (guide §4).

export interface DitherCheckboxGroupProps {
  options: Option[]
  value: string[]
  color?: PixelColor
  label?: string
  class?: string
  onChange?: (value: string[]) => void
}

export function DitherCheckboxGroup({
  options,
  value,
  color = "blue",
  label,
  class: className,
  onChange,
}: DitherCheckboxGroupProps) {
  function toggle(value_: string, on: boolean) {
    onChange?.(on ? [...value, value_] : value.filter((v) => v !== value_))
  }

  return (
    <div role="group" aria-label={label} className={cn("grid gap-3", className)}>
      {options.map((o) => (
        <DitherCheckbox
          key={o.value}
          value={value.includes(o.value)}
          color={color}
          disabled={o.disabled}
          onChange={(on) => toggle(o.value, on)}
        >
          {o.label}
        </DitherCheckbox>
      ))}
    </div>
  )
}
