"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "./lib";
import { useInDom } from "./use-in-dom";
import { usePresence } from "./use-presence";
import styles from "./overlay-transitions.module.css";

export type ContextMenuItem = {
  label?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
};

export interface DitherContextMenuProps {
  items: ContextMenuItem[];
  onSelect?: (label: string) => void;
  /** The content the context menu wraps (right-click target). */
  children?: React.ReactNode;
}

/**
 * DitherContextMenu — right-click context menu rendered into `document.body`
 * via a portal (guide §6: `<Teleport>` → `createPortal`). Verbatim port of
 * DitherContextMenu.vue.
 *
 * - `contextmenu` event opens the panel at the cursor, clamped inside the
 *   viewport (menus near an edge flip inward).
 * - ArrowUp/Down moves focus through enabled items; Escape closes.
 * - Outside pointerdown and window blur close the panel. Both are attached
 *   after a `setTimeout(0)` so the opening press doesn't immediately close it.
 * - The panel keeps DOM focus (`tabindex={-1}`) so keyboard nav works without
 *   moving the page focus.
 */
export function DitherContextMenu({ items, onSelect, children }: DitherContextMenuProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onContextmenu(e: React.MouseEvent): void {
    e.preventDefault();
    itemRefs.current = [];
    const x = e.clientX;
    const y = e.clientY;
    setPos({ x, y });
    // Clamp inside the viewport after the panel mounts and measures — mirrors
    // the Vue `nextTick` measure-then-clamp (guide §7: DOM read after a state
    // render → `useLayoutEffect`). Using `requestAnimationFrame` here is the
    // faithful post-paint equivalent; the panel is in the DOM by then.
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const r = panel.getBoundingClientRect();
      setPos({
        x: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)),
        y: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)),
      });
      panel.focus();
    });
  }

  function pick(it: ContextMenuItem): void {
    if (it.disabled || it.divider) return;
    onSelect?.(it.label ?? "");
    setPos(null);
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
    if (e.key === "Escape") {
      e.stopPropagation();
      setPos(null);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(-1);
    }
  }

  // Outside-dismiss + blur close. Runs only while a panel is open.
  useEffect(() => {
    if (!pos) return;

    function closePanel(): void {
      setPos(null);
    }
    // Defer so the opening press doesn't immediately close it.
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", closePanel);
      window.addEventListener("blur", closePanel);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", closePanel);
      window.removeEventListener("blur", closePanel);
    };
  }, [pos]);

  const mounted = usePresence(pos !== null, 140);
  const inDom = useInDom();

  return (
    <div onContextMenu={onContextmenu}>
      {children}
      {inDom && mounted && pos ? (
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            tabIndex={-1}
            className={cn(
              styles.popPanel,
              "fixed z-[100] min-w-[180px] rounded-lg border border-border bg-card p-1 text-foreground shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)] outline-none",
              pos === null && styles.popHide,
            )}
            style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
            onPointerDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={onKeydown}
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
          </div>,
          document.body,
        )
      ) : null}
    </div>
  );
}
