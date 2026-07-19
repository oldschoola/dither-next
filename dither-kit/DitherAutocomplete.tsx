"use client"

import { useMemo, useState, type KeyboardEvent } from "react"
import { cn } from "./lib"

// Port of DitherAutocomplete.vue. Simpler combobox — free-text input over a
// string list, with a filtered dropdown and keyboard nav. v-model:
// modelValue + update:modelValue → value + onChange (guide §4).

export interface DitherAutocompleteProps {
  suggestions: string[]
  value: string
  placeholder?: string
  disabled?: boolean
  class?: string
  onChange?: (value: string) => void
}

export function DitherAutocomplete({
  suggestions,
  value,
  placeholder = "Search…",
  disabled = false,
  class: className,
  onChange,
}: DitherAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return suggestions
    return suggestions.filter((s) => s.toLowerCase().includes(q))
  }, [suggestions, value])

  function onInput(e: React.FormEvent<HTMLInputElement>) {
    onChange?.(e.currentTarget.value)
    setOpen(true)
    setHighlighted(0)
  }

  function pick(s: string) {
    onChange?.(s)
    setOpen(false)
  }

  function move(dir: number) {
    const n = filtered.length
    if (!n) return
    setHighlighted((highlighted + dir + n) % n)
  }

  function onKeydown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setHighlighted(0)
      } else {
        move(e.key === "ArrowDown" ? 1 : -1)
      }
    } else if (e.key === "Enter") {
      if (!open) return
      e.preventDefault()
      const s = filtered[highlighted]
      if (s !== undefined) pick(s)
    } else if (e.key === "Escape" && open) {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open && filtered.length > 0}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        className="w-full rounded-md border border-border bg-background/60 px-3 py-2 font-mono text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
        onInput={onInput}
        onClick={() => setOpen(true)}
        onKeyDown={onKeydown}
        onBlur={() => setOpen(false)}
      />
      {open && filtered.length > 0 ? (
        <div
          role="listbox"
          className="absolute top-full z-30 mt-1 w-full rounded-lg border border-border bg-card p-1"
        >
          {filtered.map((s, i) => (
            <div
              key={s}
              role="option"
              aria-selected={s === value}
              className={cn(
                "cursor-pointer rounded-md px-2 py-1.5 text-[12px]",
                i === highlighted
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
              onPointerEnter={() => setHighlighted(i)}
              onPointerDown={(e) => {
                e.preventDefault()
                pick(s)
              }}
            >
              {s}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
