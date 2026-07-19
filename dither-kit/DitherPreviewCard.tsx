"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "./lib";
import { usePresence } from "./use-presence";
import styles from "./overlay-transitions.module.css";

export interface DitherPreviewCardProps {
  /** Open delay in ms — mirrors the Vue kit's default. */
  delay?: number;
  /** Trigger slot — the element the user hovers/focuses. */
  trigger?: React.ReactNode;
  /** Card content shown on hover. */
  children?: React.ReactNode;
}

/**
 * DitherPreviewCard — hover/focus preview popover with an open delay and a
 * small close delay so the pointer can travel into the card without it
 * dismissing. Verbatim port of DitherPreviewCard.vue.
 *
 * Timers live in refs; the card stays mounted during its 140ms leave
 * transition (see `usePresence`, guide §6).
 */
export function DitherPreviewCard({ delay = 400, trigger, children }: DitherPreviewCardProps) {
  const [shown, setShown] = useState(false);
  const openTimer = useRef(0);
  const closeTimer = useRef(0);

  function show(): void {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => setShown(true), delay);
  }
  function hide(): void {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    // Small close-delay so moving the pointer into the card keeps it open.
    closeTimer.current = window.setTimeout(() => setShown(false), 100);
  }
  function keepOpen(): void {
    window.clearTimeout(closeTimer.current);
  }
  function onKeydown(e: React.KeyboardEvent): void {
    if (e.key === "Escape") {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
      setShown(false);
    }
  }

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const mounted = usePresence(shown, 140);

  return (
    <span className="relative inline-block" onKeyDown={onKeydown}>
      <span
        className="inline-block"
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {trigger}
      </span>
      {mounted ? (
        <div
          className={cn(
            styles.popPanel,
            "absolute bottom-full left-1/2 z-30 mb-1.5 w-64 -translate-x-1/2 rounded-lg border border-border bg-card p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]",
            !shown && styles.popHide,
          )}
          onPointerEnter={keepOpen}
          onPointerLeave={hide}
        >
          {children}
        </div>
      ) : null}
    </span>
  );
}
