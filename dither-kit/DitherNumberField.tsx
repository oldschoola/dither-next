"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { CONTROL, CONTROL_BUTTON } from "./control"
import { cn } from "./lib"

// Port of DitherNumberField.vue. Controlled input with a local text buffer
// synced to `value` via watch→useEffect; commits on blur and arrow keys.
// v-model: modelValue + update:modelValue → value + onChange (guide §4).

export interface DitherNumberFieldProps {
  value: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  onChange?: (value: number) => void
}

export function DitherNumberField({
  value,
  min,
  max,
  step = 1,
  disabled = false,
  onChange,
}: DitherNumberFieldProps) {
  // Local text buffer mirrors the Vue `ref(String(props.modelValue))`. The
  // Vue `watch(props.modelValue, v => text.value = String(v))` becomes an
  // effect that resyncs when the parent updates `value` (but skips the echo
  // of our own commit so the user can keep typing mid-input). The
  // lastCommitted ref distinguishes parent-driven changes from our own.
  const [text, setText] = useState(() => String(value))
  const lastCommitted = useRef(value)

  useEffect(() => {
    if (value !== lastCommitted.current) {
      setText(String(value))
      lastCommitted.current = value
    }
  }, [value])

  const atMin = min !== undefined && value <= min
  const atMax = max !== undefined && value >= max

  function clampStep(raw: number): number {
    const base = min ?? 0
    let v = base + Math.round((raw - base) / step) * step
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    return v
  }

  function set(raw: number) {
    const next = clampStep(raw)
    lastCommitted.current = next
    onChange?.(next)
    setText(String(next))
  }

  function onBlur() {
    const parsed = Number.parseFloat(text)
    if (Number.isNaN(parsed)) {
      setText(String(value))
      return
    }
    set(parsed)
  }

  function onKeydown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault()
      set(value + step)
    } else if (event.key === "ArrowDown") {
      event.preventDefault()
      set(value - step)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Decrease"
        disabled={disabled || atMin}
        className={cn(
          CONTROL_BUTTON,
          "size-10 rounded-md border border-border text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
        )}
        onClick={() => set(value - step)}
      >
        -
      </button>
      <input
        value={text}
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        disabled={disabled}
        className={cn(CONTROL, "w-20 text-center tabular-nums")}
        onChange={(e) => setText(e.currentTarget.value)}
        onBlur={onBlur}
        onKeyDown={onKeydown}
      />
      <button
        type="button"
        aria-label="Increase"
        disabled={disabled || atMax}
        className={cn(
          CONTROL_BUTTON,
          "size-10 rounded-md border border-border text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
        )}
        onClick={() => set(value + step)}
      >
        +
      </button>
    </div>
  )
}
