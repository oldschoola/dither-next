"use client";

import { useEffect, useRef } from "react";

import { cn } from "./lib";
import { BAYER4, fillOf } from "./pixel";
import { rgb, type Rgb } from "./palette";

export type SeparatorOrientation = "horizontal" | "vertical";

const CELL = 2;
const GREY = fillOf("grey");

/**
 * A one-cell line whose pixels drop out toward both ends through the Bayer
 * matrix — DitherImage's edge-dissolve recipe applied to a rule. Verbatim
 * port of DitherSeparator.vue's standalone-script `paintSeparator`.
 */
function paintSeparator(
  ctx: CanvasRenderingContext2D,
  cells: number,
  vertical: boolean,
  matrix: number[][] = BAYER4,
): void {
  ctx.clearRect(0, 0, vertical ? 1 : cells, vertical ? cells : 1);
  const half = cells / 2;
  for (let i = 0; i < cells; i++) {
    const e = 1 - Math.abs(i + 0.5 - half) / half; // 1 at center, 0 at ends
    const x = vertical ? 0 : i;
    const y = vertical ? i : 0;
    if (e < 1 && e * e <= matrix[y & 3][x & 3]) continue;
    ctx.fillStyle = rgb(GREY as Rgb, 1, 0.35 + 0.45 * e);
    ctx.fillRect(x, y, 1, 1);
  }
}

export interface DitherSeparatorProps {
  orientation?: SeparatorOrientation;
  class?: string;
}

/**
 * DitherSeparator — a horizontal/vertical dithered rule. Canvas-backed with a
 * `willReadFrequently` 2D context; `ResizeObserver` repaints on size change.
 * Mount-time paint is deferred to `requestAnimationFrame` to avoid forced
 * reflow when many components mount together (guide §9 rule 4).
 *
 * No animation loop — the rule is static once painted, so `prefers-reduced-motion`
 * is irrelevant here (honored implicitly by the absence of a RAF loop).
 */
export function DitherSeparator({
  orientation = "horizontal",
  class: className,
}: DitherSeparatorProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Track the latest orientation in a ref so the ResizeObserver callback (set
  // up once on mount) reads the current value without re-subscribing.
  const orientationRef = useRef(orientation);
  orientationRef.current = orientation;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    function paint(): void {
      const w = wrapRef.current;
      const cv = canvasRef.current;
      const ctx = cv?.getContext("2d", { willReadFrequently: true });
      if (!w || !cv || !ctx) return;
      const box = w.getBoundingClientRect();
      const vertical = orientationRef.current === "vertical";
      const cells = Math.max(4, Math.round((vertical ? box.height : box.width) / CELL));
      cv.width = vertical ? 1 : cells;
      cv.height = vertical ? cells : 1;
      paintSeparator(ctx, cells, vertical);
    }

    let ro: ResizeObserver | null = null;
    const raf = requestAnimationFrame(() => {
      paint();
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(paint);
        ro.observe(wrap);
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  const vertical = orientation === "vertical";

  return (
    <div
      ref={wrapRef}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "relative",
        vertical ? "h-full w-[2px]" : "h-[2px] w-full",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
