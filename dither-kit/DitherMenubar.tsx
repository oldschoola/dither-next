"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "./lib";
import { usePresence } from "./use-presence";
import styles from "./overlay-transitions.module.css";

export type MenubarItem = {
  label?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
};

export type MenubarMenu = { label: string; items: MenubarItem[] };

export interface DitherMenubarProps {
  menus: MenubarMenu[];
  onSelect?: (menu: string, item: string) => void;
}

/**
 * DitherMenubar — horizontal menu bar with two-level keyboard nav. Verbatim
 * port of DitherMenubar.vue.
 *
 * - Only one menu open at a time (`openIndex`).
 * - Desktop hover-to-switch: hovering another top item while a menu is open
 *   moves the open menu to it.
 * - ArrowLeft/Right moves between top items (and the open menu follows when
 *   one is open); ArrowUp/Down moves within the open menu; Escape closes and
 *   refocuses the top item.
 * - Outside pointerdown closes. Deferred via `setTimeout(0)` so the opening
 *   click doesn't immediately close it.
 * - Refs are arrays indexed by render position (static `menus` prop).
 */
export function DitherMenubar({ menus, onSelect }: DitherMenubarProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const topRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function toggle(i: number): void {
    setOpenIndex((cur) => (cur === i ? null : i));
  }
  function hover(i: number): void {
    if (openIndex !== null && openIndex !== i) setOpenIndex(i);
  }
  function pick(menu: MenubarMenu, it: MenubarItem, mi: number): void {
    if (it.disabled || it.divider) return;
    onSelect?.(menu.label, it.label ?? "");
    setOpenIndex(null);
    topRefs.current[mi]?.focus();
  }

  function moveTop(dir: number): void {
    const n = menus.length;
    if (!n) return;
    const cur =
      openIndex ?? topRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    const next = cur === -1 ? (dir > 0 ? 0 : n - 1) : (cur + dir + n) % n;
    topRefs.current[next]?.focus();
    if (openIndex !== null) setOpenIndex(next);
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
    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveTop(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveTop(-1);
    } else if (e.key === "Escape" && openIndex !== null) {
      e.stopPropagation();
      const i = openIndex;
      setOpenIndex(null);
      topRefs.current[i]?.focus();
    } else if (e.key === "ArrowDown" && openIndex !== null) {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === "ArrowUp" && openIndex !== null) {
      e.preventDefault();
      moveFocus(-1);
    }
  }

  useEffect(() => {
    if (openIndex === null) return;

    function onOutside(e: PointerEvent): void {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpenIndex(null);
    }
    // Defer so the opening click doesn't immediately close it.
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onOutside);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onOutside);
    };
  }, [openIndex]);

  // Clear stale item refs whenever a menu opens.
  useEffect(() => {
    if (openIndex !== null) itemRefs.current = [];
  }, [openIndex]);

  return (
    <div
      ref={rootRef}
      role="menubar"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5"
      onKeyDown={onKeydown}
    >
      {menus.map((menu, mi) => {
        const isOpen = openIndex === mi;
        const mounted = usePresence(isOpen, 140);
        return (
          <div key={menu.label} className="relative inline-block">
            <button
              ref={(el) => {
                topRefs.current[mi] = el;
              }}
              type="button"
              aria-haspopup="menu"
              aria-expanded={isOpen}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-xs transition-colors focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none",
                isOpen
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => toggle(mi)}
              onPointerEnter={() => hover(mi)}
            >
              {menu.label}
            </button>
            {mounted ? (
              <div
                role="menu"
                className={cn(
                  styles.popPanel,
                  "absolute top-full left-0 z-30 mt-1.5 min-w-[180px] rounded-lg border border-border bg-card p-1 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]",
                  !isOpen && styles.popHide,
                )}
              >
                {menu.items.map((it, i) =>
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
                      onClick={() => pick(menu, it, mi)}
                    >
                      {it.label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
