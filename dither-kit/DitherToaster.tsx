"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { dismiss, useToasts, type Toast } from "./toast";
import { BAYER4, fillOf, type PixelColor } from "./pixel";
import { rgb } from "./palette";
import { cn } from "./lib";
import { useInDom } from "./use-in-dom";
import styles from "./overlay-transitions.module.css";

const CELL = 2;

/**
 * Paint the 3px left rail — DitherCollapsible's vertical dither ramp. Verbatim
 * port of the `paintRail` standalone-script helper in DitherToaster.vue.
 */
function paintRail(
  canvas: HTMLCanvasElement,
  color: PixelColor,
  matrix: number[][] = BAYER4,
): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const height = canvas.offsetHeight;
  if (!ctx || height <= 0) return;
  const rows = Math.max(4, Math.round(height / CELL));
  canvas.width = 1;
  canvas.height = rows;
  const fill = fillOf(color);
  ctx.clearRect(0, 0, 1, rows);
  for (let y = 0; y < rows; y++) {
    const density = 1 - (y + 0.5) / rows;
    const lit = density > matrix[y & 3][0];
    const alpha = lit ? 0.35 + 0.65 * density : 0.12 * density;
    if (alpha <= 0.004) continue;
    ctx.fillStyle = rgb(fill, 1, alpha);
    ctx.fillRect(0, y, 1, 1);
  }
}

export interface DitherToasterProps {
  /** Optional class on the positioning container. */
  className?: string;
}

/**
 * DitherToaster — toast list rendered into `document.body` via a portal.
 * Verbatim port of DitherToaster.vue.
 *
 * The toast store is the foundation's module-level array + `useSyncExternalStore`
 * (guide §3, §12). `useToasts()` subscribes; `dismiss(id)` removes.
 *
 * The Vue kit uses `<TransitionGroup name="dk-toast">` for enter/leave FLIP.
 * Toasts are append-only and dismissed individually — they never reorder — so
 * a per-toast enter transition (mount hidden → toggle shown next frame) is the
 * faithful port without `react-transition-group` (the kit avoids motion libs by
 * design, guide §6). Leave is store-driven: a dismissed toast unmounts
 * immediately, matching the Vue `v-for` list dropping it. The visible
 * animation is the enter glide; the `dismiss` × button is explicit user action.
 */
export function DitherToaster({ className }: DitherToasterProps) {
  const toasts = useToasts();
  const inDom = useInDom();
  if (!inDom) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed right-4 bottom-4 z-[60] grid justify-items-end gap-2",
        className,
      )}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>,
    document.body,
  );
}

interface ToastCardProps {
  toast: Toast;
}

function ToastCard({ toast }: ToastCardProps) {
  const railRef = useRef<HTMLCanvasElement | null>(null);
  // Enter: start hidden, then on the next paint remove the hide class so the
  // CSS transition plays. `entered` flips true in a layout effect after the
  // initial hidden state is committed.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    // Defer one frame so the browser commits the initial (hidden) state first.
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (railRef.current) paintRail(railRef.current, toast.color);
    });
    return () => cancelAnimationFrame(id);
  }, [toast.color]);

  return (
    <div
      className={cn(
        styles.toastCard,
        "pointer-events-auto flex gap-2 rounded-lg border border-border bg-card px-3 py-2 font-mono text-[12px]",
        !entered && styles.toastHide,
      )}
    >
      <canvas
        ref={railRef}
        aria-hidden="true"
        className="w-[3px] self-stretch"
        style={{ imageRendering: "pixelated" }}
      />
      <span className="min-w-0 flex-1 self-center">{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        className="self-center text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none"
        onClick={() => dismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
}
