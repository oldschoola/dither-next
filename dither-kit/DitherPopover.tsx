"use client";

import { useEffect, useRef } from "react";

import { cn } from "./lib";
import { usePresence } from "./use-presence";
import styles from "./overlay-transitions.module.css";

export interface DitherPopoverProps {
  open: boolean;
  align?: "start" | "center" | "end";
  onClose?: () => void;
  /** Trigger slot — usually a button. Rendered inline so the panel can anchor. */
  trigger?: React.ReactNode;
  /** Content shown when open. */
  children?: React.ReactNode;
}

const ALIGN: Record<NonNullable<DitherPopoverProps["align"]>, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

/**
 * DitherPopover — anchored dropdown panel. Verbatim port of DitherPopover.vue.
 *
 * The panel is positioned absolutely under the trigger. Outside-pointerdown and
 * Escape dismiss are attached to `window` AFTER the opening pointer event
 * resolves (deferred via `setTimeout(0)`) so the click that opened the popover
 * does not immediately close it — same guard as the Vue kit.
 *
 * The panel stays mounted during its leave transition (see `usePresence`,
 * guide §6) and toggles `popHide` to run the CSS opacity+slide.
 */
export function DitherPopover({
  open,
  align = "start",
  onClose,
  trigger,
  children,
}: DitherPopoverProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Keep the latest `onClose` in a ref so the window listeners (attached once
  // per open) always call the current callback without re-subscribing.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    let timer = 0;

    function onOutside(e: PointerEvent): void {
      if (rootRef.current?.contains(e.target as Node)) return;
      onCloseRef.current?.();
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onCloseRef.current?.();
    }

    // Defer so the opening click doesn't immediately close it.
    timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onOutside);
      window.addEventListener("keydown", onKey);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 140ms matches the CSS transition (overlay-transitions.module.css `.popPanel`).
  const mounted = usePresence(open, 140);

  return (
    <div ref={rootRef} className="relative inline-block">
      {trigger}
      {mounted ? (
        <div
          className={cn(
            styles.popPanel,
            "absolute top-full z-30 mt-1.5 min-w-[180px] rounded-lg border border-border bg-card p-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]",
            ALIGN[align],
            !open && styles.popHide,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
