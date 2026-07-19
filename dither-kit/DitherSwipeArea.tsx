"use client";

import { useRef, useState } from "react";

import { cn } from "./lib";

export interface DitherSwipeAreaProps {
  /** Which edge the drawer slides in from. */
  side?: "right" | "left" | "bottom";
  /** Strip thickness in px. */
  size?: number;
  /** Swipe distance in px that commits the open. */
  threshold?: number;
  disabled?: boolean;
  onOpen?: () => void;
}

/**
 * DitherSwipeArea — invisible edge strip that opens a drawer on a directional
 * swipe inward from the edge. Verbatim port of DitherSwipeArea.vue.
 *
 * Pointer capture is set on `pointerdown` so the strip keeps receiving moves
 * even after the pointer leaves it. The gesture is committed exactly once per
 * gesture (`fired` guard) when the inward travel exceeds `threshold`.
 */
export function DitherSwipeArea({
  side = "right",
  size = 16,
  threshold = 24,
  disabled = false,
  onOpen,
}: DitherSwipeAreaProps) {
  const start = useRef(0);
  const fired = useRef(false);
  // `fired` is a ref (imperative guard inside a pointermove). We also need a
  // state flip on each new gesture so the guard resets and the same instance
  // can fire `onOpen` again on the next swipe. The Vue kit reset `ref(false)`
  // in `onDown`; a tick counter forces the reset render.
  const [, setTick] = useState(0);

  const pos = (e: React.PointerEvent) =>
    side === "bottom" ? e.clientY : e.clientX;
  // Inward direction: from the right edge a leftward swipe (-x) opens, etc.
  const inwardSign = () => (side === "left" ? 1 : -1);

  function onDown(e: React.PointerEvent): void {
    if (disabled) return;
    fired.current = false;
    start.current = pos(e);
    setTick((t) => t + 1);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent): void {
    if (disabled || fired.current) return;
    if ((pos(e) - start.current) * inwardSign() > threshold) {
      fired.current = true;
      onOpen?.();
    }
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed z-40 touch-none",
        side === "bottom"
          ? "inset-x-0 bottom-0"
          : side === "right"
            ? "inset-y-0 right-0"
            : "inset-y-0 left-0",
      )}
      style={
        side === "bottom"
          ? { height: `${size}px` }
          : { width: `${size}px` }
      }
      onPointerDown={onDown}
      onPointerMove={onMove}
    />
  );
}
