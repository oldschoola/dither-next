"use client";

import { useEffect, useRef } from "react";

export interface DitherToolbarProps {
  label?: string;
  children?: React.ReactNode;
}

/**
 * DitherToolbar — roving-tabindex toolbar with arrow-key navigation. Verbatim
 * port of DitherToolbar.vue. No canvas (guide §10: low risk).
 *
 * The first button starts at `tabIndex=0`; all others are `-1`. ArrowRight/
 * ArrowLeft/Home/End move focus (and the roving stop). Listeners attach to the
 * root and rely on event bubbling from the child buttons. The initial tabindex
 * assignment runs on mount; `setStops` updates the roving tabindex as focus
 * moves.
 */
export function DitherToolbar({ label, children }: DitherToolbarProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  function buttons(): HTMLElement[] {
    return Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>("button") ?? [],
    );
  }

  function setStops(active: HTMLElement): void {
    for (const b of buttons()) b.tabIndex = b === active ? 0 : -1;
  }

  useEffect(() => {
    buttons().forEach((b, i) => (b.tabIndex = i === 0 ? 0 : -1));
  }, []);

  function onKeydown(e: React.KeyboardEvent): void {
    const btns = buttons();
    if (!btns.length) return;
    const i = btns.indexOf(e.target as HTMLElement);
    let next: number;
    if (e.key === "ArrowRight") next = (i + 1 + btns.length) % btns.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + btns.length) % btns.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = btns.length - 1;
    else return;
    e.preventDefault();
    e.stopPropagation();
    setStops(btns[next]);
    btns[next].focus();
  }

  return (
    <div
      ref={rootRef}
      role="toolbar"
      aria-label={label}
      className="flex items-center gap-1 rounded-lg border border-border/60 bg-card/50 p-1"
      onKeyDown={onKeydown}
    >
      {children}
    </div>
  );
}
