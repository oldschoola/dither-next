"use client"

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react"

// Port of DitherOtpField.vue. Array refs via `v-for ref="inputs"` →
// useRef<(HTMLInputElement|null)[]> + ref callback (guide §7). The Vue
// ref array is replaced with a ref-callback that writes to index `i`.
//
// v-model: modelValue + update:modelValue → value + onChange. The Vue
// `complete` emit → onComplete callback prop.

export interface DitherOtpFieldProps {
  length?: number
  value?: string
  onChange?: (value: string) => void
  /** Fires with the full code when every digit is filled. */
  onComplete?: (code: string) => void
}

export function DitherOtpField({
  length = 6,
  value = "",
  onChange,
  onComplete,
}: DitherOtpFieldProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length }, (_, i) => value[i] ?? ""),
  )

  // Mirrors the Vue watch(props.modelValue): re-parse incoming `value` into
  // per-position digits, skipping our own emit echo (joining drops empty
  // positions, so re-parsing a partial fill would shift digits leftward).
  const lastEcho = useRef(value)
  useEffect(() => {
    if (value === lastEcho.current) return
    lastEcho.current = value
    setDigits(Array.from({ length }, (_, i) => value[i] ?? ""))
  }, [value, length])

  function commit(next: string[]) {
    const joined = next.join("")
    lastEcho.current = joined
    onChange?.(joined)
    if (next.every((d) => d !== "")) onComplete?.(joined)
  }

  function onInput(i: number, event: React.FormEvent<HTMLInputElement>) {
    const el = event.currentTarget
    const v = el.value.replace(/\D/g, "").slice(-1)
    el.value = v
    setDigits((prev) => {
      const next = [...prev]
      next[i] = v
      commit(next)
      return next
    })
    if (v && i < length - 1) inputsRef.current[i + 1]?.focus()
  }

  function onKeydown(i: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[i] && i > 0) {
      event.preventDefault()
      setDigits((prev) => {
        const next = [...prev]
        next[i - 1] = ""
        commit(next)
        return next
      })
      inputsRef.current[i - 1]?.focus()
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = (event.clipboardData?.getData("text") ?? "")
      .replace(/\D/g, "")
      .slice(0, length)
    if (!pasted) return
    event.preventDefault()
    const next = Array.from({ length }, (_, i) => pasted[i] ?? "")
    setDigits(next)
    commit(next)
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Verification code">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el
          }}
          type="text"
          maxLength={1}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          aria-label={`Digit ${i + 1}`}
          value={digits[i]}
          className="h-11 w-9 rounded-md border border-border bg-background/60 text-center font-mono text-[13px] text-foreground outline-none transition-colors focus:border-accent/60"
          onInput={(e) => onInput(i, e)}
          onKeyDown={(e) => onKeydown(i, e)}
          onPaste={onPaste}
        />
      ))}
    </div>
  )
}
