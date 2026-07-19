import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { cn } from "./lib"
import { cssColor } from "./palette"
import type { PixelColor } from "./pixel"
import type { Option } from "./DitherSelect"
import { usePresence } from "./use-presence"

// Port of DitherCombobox.vue. Controlled input + filtered list + keyboard nav.
// Local `query` state syncs to `value` via watch→useEffect (when the parent
// changes the selection, the input text snaps back to the selected label).
// The Vue dropdown had no transition; we keep it mounted-or-unmounted.

export interface DitherComboboxProps {
  options: Option[]
  value: string
  placeholder?: string
  color?: PixelColor
  disabled?: boolean
  className?: string
  onChange?: (value: string) => void
}

export function DitherCombobox({
  options,
  value,
  placeholder = "Select…",
  color = "blue",
  disabled = false,
  className,
  onChange,
}: DitherComboboxProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])
  const marker = useMemo(() => cssColor(color), [color])
  const [query, setQuery] = useState(selected?.label ?? "")

  // watch(props.modelValue) → resync the query to the selected label.
  useEffect(() => {
    setQuery(selected?.label ?? "")
  }, [selected])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  function openPanel() {
    setOpen(true)
    const i = filtered.findIndex((o) => o.value === value && !o.disabled)
    setHighlighted(i >= 0 ? i : filtered.findIndex((o) => !o.disabled))
  }

  function onInput(e: React.FormEvent<HTMLInputElement>) {
    setQuery(e.currentTarget.value)
    setOpen(true)
    setHighlighted(filtered.findIndex((o) => !o.disabled))
  }

  function pick(o: Option) {
    if (o.disabled) return
    onChange?.(o.value)
    setQuery(o.label)
    setOpen(false)
  }

  /** Blur / Escape — snap the text back to the last valid value. */
  function revert() {
    setOpen(false)
    setQuery(selected?.label ?? "")
  }

  function move(dir: number) {
    const list = filtered
    const n = list.length
    let i = highlighted
    for (let step = 0; step < n; step++) {
      i = (i + dir + n) % n
      if (!list[i].disabled) {
        setHighlighted(i)
        return
      }
    }
  }

  function onKeydown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      if (!open) openPanel()
      else move(e.key === "ArrowDown" ? 1 : -1)
    } else if (e.key === "Enter") {
      if (!open) return
      e.preventDefault()
      const o = filtered[highlighted]
      if (o) pick(o)
    } else if (e.key === "Escape" && open) {
      e.preventDefault()
      revert()
    }
  }

  const mounted = usePresence(open, 120)

  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        className="w-full rounded-md border border-border bg-background/60 px-3 py-2 pr-8 font-mono text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
        onInput={onInput}
        onClick={() => {
          if (!open) openPanel()
        }}
        onKeyDown={onKeydown}
        onBlur={revert}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        ▾
      </span>
      {mounted ? (
        <div
          role="listbox"
          className="absolute top-full z-30 mt-1 w-full rounded-lg border border-border bg-card p-1"
        >
          {filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-[12px] italic text-muted-foreground">no matches</div>
          ) : null}
          {filtered.map((o, i) => (
            <div
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled || undefined}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-[12px]",
                i === highlighted && !o.disabled ? "bg-background" : "",
                o.disabled
                  ? "cursor-default opacity-40"
                  : o.value === value || i === highlighted
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
              onPointerEnter={() => {
                if (!o.disabled) setHighlighted(i)
              }}
              onPointerDown={(e) => {
                e.preventDefault()
                pick(o)
              }}
            >
              <span>{o.label}</span>
              {o.value === value ? (
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0"
                  style={{ backgroundColor: marker, imageRendering: "pixelated" }}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
