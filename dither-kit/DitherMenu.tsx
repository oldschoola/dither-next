"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "./lib";
import { usePresence } from "./use-presence";
import styles from "./overlay-transitions.module.css";

export type MenuItem = {
  label?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
};

export interface DitherMenuProps {
  items: MenuItem[];
  onSelect?: (label: string) => void;
  /** Trigger button label slot. */
  children?: React.ReactNode;
}

/**
 * DitherMenu — dropdown menu with keyboard nav and outside dismiss. Verbatim
 * port of DitherMenu.vue.
 *
 * - Click the trigger to toggle; click an item to select + close (refocusing
 *   the trigger).
 * - ArrowUp/Down moves focus through enabled items; Escape closes (refocusing).
 * - Outside pointerdown closes. The outside listener is attached after a
 *   `setTimeout(0)` so the opening click doesn't immediately close it.
 * - Item refs are collected via a ref callback into a `Map<number, HTMLButtonElement>`
 *   (guide §7 recommends Map/array with cleanup over Vue's index assignment).
 *   Here a plain array indexed by the render position is fine because items
 *   are a static prop list and never reorder.
 */
export function DitherMenu({ items, onSelect, children }: DitherMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function closeMenu(refocus = false): void {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function pick(it: MenuItem): void {
    if (it.disabled || it.divider) return;
    onSelect?.(it.label ?? "");
    closeMenu(true);
  }

  function moveFocus(dir: number): void {
    const els = itemRefs.current.filter((el): el is HTMLButtonElement => !!el);
    if (!els.length) return;
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      i === -1 ? (dir > 0 ? 0 : els.length - 1) : (i + dir + els.length) % els.length;
    els[next]?.focus();
  }

  function onKeydown(e: React.KeyboardEvent): void {
    if (!open) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      closeMenu(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(-1);
    }
  }

  // Outside-dismiss + ref cleanup. Runs only while open.
  useEffect(() => {
    if (!open) return;

    function onOutside(e: PointerEvent): void {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    // Defer so the opening click doesn't immediately close it.
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onOutside);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onOutside);
    };
  }, [open]);

  // Clear stale item refs whenever we (re)open so moveFocus starts clean.
  useEffect(() => {
    if (open) itemRefs.current = [];
  }, [open]);

  const mounted = usePresence(open, 140);

  return (
    <div ref={rootRef} className="relative inline-block" onKeyDown={onKeydown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-background focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none"
        onClick={() => setOpen((v) => !v)}
      >
        {children}
      </button>
      {mounted ? (
        <div
          role="menu"
          className={cn(
            styles.popPanel,
            "absolute top-full left-0 z-30 mt-1.5 min-w-[180px] rounded-lg border border-border bg-card p-1 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]",
            !open && styles.popHide,
          )}
        >
          {items.map((it, i) =>
            it.divider ? (
              <div key={i} className="my-1 h-px bg-border" />
            ) : (
              <button
                key={i}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                className={cn(
                  "flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-40",
                  it.danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-foreground hover:bg-background",
                )}
                onClick={() => pick(it)}
              >
                {it.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
