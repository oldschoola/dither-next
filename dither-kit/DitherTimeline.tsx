"use client";

import { useEffect, useRef } from "react";

import { BAYER4, fillOf, type PixelColor } from "./pixel";
import { rgb } from "./palette";
import { cn } from "./lib";

export type TimelineItem = {
  title: string;
  time?: string;
  body?: string;
  color?: PixelColor;
};

const CELL = 2;

/** A small dithered filled dot — dense core fading at the rim through Bayer.
 *  Verbatim port of the `paintDot` standalone helper in DitherTimeline.vue. */
function paintDot(
  ctx: CanvasRenderingContext2D,
  cells: number,
  color: PixelColor,
): void {
  ctx.clearRect(0, 0, cells, cells);
  const c = cells / 2;
  const fill = fillOf(color);
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const r = Math.hypot(x + 0.5 - c, y + 0.5 - c) / c; // 0 center → 1 rim
      const density = 1 - r;
      if (density <= 0 || density <= BAYER4[y & 3][x & 3]) continue;
      ctx.fillStyle = rgb(fill, 1, 0.5 + 0.5 * density);
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

export interface DitherTimelineProps {
  items: TimelineItem[];
  dotSize?: number;
  class?: string;
}

/**
 * DitherTimeline — vertical timeline with dithered dots. Verbatim port of
 * DitherTimeline.vue. Each dot is a `willReadFrequently` canvas painted once
 * on mount (guide §9). Array refs collected via a ref callback into a stable
 * array (guide §7).
 */
export function DitherTimeline({
  items,
  dotSize = 12,
  class: className,
}: DitherTimelineProps) {
  const dotsRef = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const cells = Math.max(4, Math.round(dotSize / CELL));
    dotsRef.current.forEach((canvas, i) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      canvas.width = cells;
      canvas.height = cells;
      paintDot(ctx, cells, items[i]?.color ?? "blue");
    });
  }, [items, dotSize]);

  return (
    <ol className={cn("relative flex flex-col", className)}>
      {items.map((it, i) => (
        <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
          {/* rail: dot + connecting line down to the next item */}
          <div className="relative flex flex-col items-center">
            <canvas
              ref={(el) => {
                dotsRef.current[i] = el;
              }}
              aria-hidden="true"
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                imageRendering: "pixelated",
              }}
            />
            {i < items.length - 1 ? (
              <span aria-hidden="true" className="mt-1 w-px flex-1 bg-border" />
            ) : null}
          </div>
          <div className="flex-1 pt-px">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] text-foreground">{it.title}</p>
              {it.time ? (
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">
                  {it.time}
                </span>
              ) : null}
            </div>
            {it.body ? (
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {it.body}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
