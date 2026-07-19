"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib";

export interface MenuItem {
  label?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose?: () => void;
}

/**
 * ContextMenu — a fixed-position portal menu. Verbatim port of
 * `src/shared/ui/ContextMenu.vue`.
 *
 * Vue `<Teleport to="body">` → `createPortal` (guide §6). The deferred
 * `pointerdown`/`keydown`/`blur` outside-dismiss listeners (the Vue SFC
 * deferred them via `setTimeout(…, 0)` so the opening click doesn't
 * immediately close it) become a single `useEffect` that schedules the
 * listeners on the next macrotask and tears them down on unmount (guide §2).
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  useEffect(() => {
    if (!onClose) return;
    // Defer so the opening click doesn't immediately close it.
    const id = setTimeout(() => {
      window.addEventListener("pointerdown", onClose);
      window.addEventListener("blur", onClose);
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      window.removeEventListener("pointerdown", onClose);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  function run(it: MenuItem) {
    if (it.disabled || it.divider) return;
    it.onClick?.();
    onClose?.();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed z-[100] min-w-[172px] rounded-lg border border-border bg-card p-1 text-foreground shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]"
      style={{ left: `${x}px`, top: `${y}px` }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) =>
        it.divider ? (
          <div key={i} className="my-1 h-px bg-border" />
        ) : (
          <button
            key={i}
            type="button"
            disabled={it.disabled}
            className={cn(
              "flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-40",
              it.danger
                ? "text-red-400 hover:bg-red-500/10"
                : "text-foreground hover:bg-background",
            )}
            onClick={() => run(it)}
          >
            {it.label}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}
