"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, useId } from "react"
import { CONTROL, POPOVER, useField } from "./control"
import { cn } from "./lib"
import { cssColor } from "./palette"
import type { PixelColor } from "./pixel"
import { usePresence } from "./use-presence"

// Port of DitherSelect.vue. State machine: open/close, activeDescendant,
// outside dismiss via a document-level pointerdown listener (guide §5 —
// useEffect with cleanup). Vue `<Transition name="dk-popover">` → CSS
// transition gated by usePresence so the panel can animate out before
// unmount (guide §6). Vue `nextTick(focus)` → flushSync-free focus in the
// event handler (the trigger is already mounted, focus is synchronous).
//
// The `Option` type is the canonical one the kit shares (CheckboxGroup,
// RadioGroup, ToggleGroup, Combobox import it from here).

export type Option = { value: string; label: string; disabled?: boolean }


export interface DitherSelectProps {
  options: Option[]
  value: string
  placeholder?: string
  color?: PixelColor
  disabled?: boolean
  invalid?: boolean
  className?: string
  onChange?: (value: string) => void
}

export function DitherSelect({
  options,
  value,
  placeholder = "Select…",
  color = "blue",
  disabled = false,
  invalid: invalidProp,
  className,
  onChange,
  ...rest
}: DitherSelectProps) {
  const field = useField()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const idBase = `dk-select-${useId()}`
  const listId = `${idBase}-listbox`

  const invalid = invalidProp || field?.invalid || false
  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value])
  const marker = useMemo(() => cssColor(color), [color])
  const optionId = (i: number) => `${idBase}-option-${i}`

  function openPanel() {
    if (disabled) return
    setOpen(true)
    const selectedIndex = options.findIndex((o) => o.value === value && !o.disabled)
    setHighlighted(
      selectedIndex >= 0 ? selectedIndex : options.findIndex((o) => !o.disabled),
    )
  }
  function close() {
    setOpen(false)
  }
  function pick(o: Option) {
    if (o.disabled) return
    onChange?.(o.value)
    close()
    triggerRef.current?.focus()
  }
  function move(dir: number) {
    const n = options.length
    if (!n) return
    let i = highlighted
    for (let step = 0; step < n; step++) {
      i = (i + dir + n) % n
      if (!options[i].disabled) {
        setHighlighted(i)
        return
      }
    }
  }
  function edge(toEnd: boolean) {
    const enabled = options
      .map((o, i) => ({ o, i }))
      .filter(({ o }) => !o.disabled)
    setHighlighted(enabled[toEnd ? enabled.length - 1 : 0]?.i ?? -1)
  }
  function onKeydown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault()
        openPanel()
        if (e.key === "ArrowUp") edge(true)
      }
      return
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      move(e.key === "ArrowDown" ? 1 : -1)
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault()
      edge(e.key === "End")
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      const option = options[highlighted]
      if (option) pick(option)
    } else if (e.key === "Escape" || e.key === "Tab") {
      close()
    }
  }
  function onOutside(e: globalThis.PointerEvent) {
    if (open && rootRef.current && !rootRef.current.contains(e.target as Node)) close()
  }

  // onMounted/onBeforeUnmount document listener → single effect.
  useEffect(() => {
    document.addEventListener("pointerdown", onOutside)
    return () => document.removeEventListener("pointerdown", onOutside)
  })

  // The dropdown stays mounted (CSS-animated) while `open` OR during the
  // leave window so it can animate out before unmount.
  const mounted = usePresence(open, 140)

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && highlighted >= 0 ? optionId(highlighted) : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={field?.describedBy}
        id={field?.controlId}
        disabled={disabled}
        style={invalid ? { borderColor: cssColor("red") } : undefined}
        className={cn(CONTROL, "flex w-full items-center justify-between gap-3 text-left")}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={onKeydown}
        {...rest}
      >
        <span className={cn("truncate", selected ? "text-foreground" : "text-muted-foreground/70")}>
          {selected?.label ?? placeholder}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "text-muted-foreground transition-transform motion-reduce:transition-none",
            open ? "rotate-180" : "",
          )}
        >
          ⌄
        </span>
      </button>
      {mounted ? (
        <div
          id={listId}
          role="listbox"
          className={cn(
            POPOVER,
            "absolute top-full z-30 mt-1 max-h-64 w-full overflow-auto p-1",
            "origin-top transition-[transform,opacity] duration-100 ease-out motion-reduce:transition-none",
            open ? "dk-popover-show" : "dk-popover-hide",
          )}
        >
          {options.map((o, i) => (
            <div
              id={optionId(i)}
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled || undefined}
              className={cn(
                "flex min-h-9 items-center justify-between rounded-md px-2.5 py-1.5 text-[12px]",
                i === highlighted && !o.disabled ? "bg-background text-foreground" : "",
                o.disabled
                  ? "cursor-default opacity-40"
                  : "cursor-pointer text-muted-foreground hover:bg-background hover:text-foreground",
              )}
              onPointerEnter={() => {
                if (!o.disabled) setHighlighted(i)
              }}
              onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
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
