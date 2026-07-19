"use client";

import { useEffect, useRef, useState } from "react";

import { usePresence } from "./use-presence";
import { cn } from "./lib";
import styles from "./overlay-transitions.module.css";

export interface DitherTooltipProps {
  text: string;
  /** Show delay in ms — mirrors the Vue kit's default. */
  delay?: number;
  children?: React.ReactNode;
}

/**
 * DitherTooltip — hover/focus tooltip with a show delay. Verbatim port of
 * DitherTooltip.vue.
 *
 * A `setTimeout` gates the show so a quick pointer sweep does not flash the
 * tip. Hide is immediate (clearing the timer + flipping `shown`). Escape also
 * hides. The tip stays mounted during its 140ms leave transition.
 */
export function DitherTooltip({ text, delay = 300, children }: DitherTooltipProps) {
  const [shown, setShown] = useState(false);
  const timer = useRef(0);

  function show(): void {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(true), delay);
  }
  function hide(): void {
    window.clearTimeout(timer.current);
    setShown(false);
  }
  function onKeydown(e: React.KeyboardEvent): void {
    if (e.key === "Escape") hide();
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const mounted = usePresence(shown, 140);

  return (
    <span
      className="relative inline-block"
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={onKeydown}
    >
      {children}
      {mounted ? (
        <span
          role="tooltip"
          className={cn(
            styles.popPanel,
            "absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 rounded border border-border bg-card px-2 py-1 text-[11px] whitespace-nowrap text-foreground",
            !shown && styles.popHide,
          )}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
