"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  BAYER4,
  fillOf,
  pixelMatrixFromSeed,
  xorshift32,
  type PixelColor,
} from "./pixel";
import { rgb, type Rgb } from "./palette";
import { cn } from "./lib";

const CELL = 2;

type Pt = [number, number];

/** 10 alternating outer/inner vertices of a 5-point star centred in a cell
 *  box, `rot` tilts it (seeded for a little per-rating character). Verbatim
 *  port of the `starPoly` standalone helper in DitherRating.vue. */
function starPoly(c: number, rot: number): Pt[] {
  const outer = c - 0.5;
  const inner = outer * 0.42;
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
  }
  return pts;
}

function inPoly(px: number, py: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

/** Paint `max` dithered stars. Each star fills left-to-right up to its
 *  fraction of `value` (so 3.5 lights three-and-a-half); the lit body is
 *  dense, the empty remainder a faint dithered ghost, the boundary dissolving
 *  through the matrix. Verbatim port of `paintRating` in DitherRating.vue. */
function paintRating(
  ctx: CanvasRenderingContext2D,
  cells: number,
  max: number,
  value: number,
  fill: Rgb,
  matrix: number[][],
  rot: number,
): void {
  ctx.clearRect(0, 0, cells * max, cells);
  const poly = starPoly(cells / 2, rot);
  for (let s = 0; s < max; s++) {
    const level = Math.min(Math.max(value - s, 0), 1);
    const ox = s * cells;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        if (!inPoly(x + 0.5, y + 0.5, poly)) continue;
        const frac = x / cells;
        const on = frac <= level;
        const density = on ? 0.92 : 0.16;
        if (density <= matrix[y & 3][x & 3]) continue;
        ctx.fillStyle = on ? rgb(fill, 1, 1) : rgb(fill, 0.55, 0.5);
        ctx.fillRect(ox + x, y, 1, 1);
      }
    }
  }
}

export interface DitherRatingProps {
  value?: number;
  max?: number;
  color?: PixelColor;
  size?: number;
  readonly?: boolean;
  label?: string;
  seed?: number;
  onChange?: (value: number) => void;
}

/**
 * DitherRating — canvas star rating with hover preview + keyboard nav.
 * Verbatim port of DitherRating.vue.
 *
 * `value`/`onChange` is the controlled contract (Vue `modelValue` +
 * `update:modelValue`, guide §4). The canvas is `willReadFrequently` and
 * repaints on value/max/color/size/hover/seed changes (guide §9). Hover shows a
 * live preview; clicking the same star clears one (so a user can dial back).
 * Keyboard: ArrowRight/Up +1, ArrowLeft/Down −1, Home 0, End max.
 */
export function DitherRating({
  value = 0,
  max = 5,
  color = "orange",
  size = 22,
  readonly = false,
  label = "Rating",
  seed,
  onChange,
}: DitherRatingProps) {
  const matrix = useMemo(
    () => (seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4),
    [seed],
  );
  const rot = useMemo(
    () =>
      seed !== undefined ? (xorshift32(Math.round(seed) ^ 0x51ed)() - 0.5) * 0.5 : 0,
    [seed],
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  function paint(): void {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    const cells = Math.max(6, Math.round(size / CELL));
    canvas.width = cells * max;
    canvas.height = cells;
    paintRating(ctx, cells, max, display, fillOf(color), matrix, rot);
  }

  // Mount paint + repaint on any dependency change (mirrors the Vue
  // `onMounted(paint)` + `watch([...], paint)` pair, guide §2).
  useEffect(() => {
    paint();
  }, [value, max, color, size, hover, matrix, rot, display]);

  function starAt(e: React.PointerEvent): number {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const f = (e.clientX - rect.left) / rect.width;
    return Math.min(Math.max(Math.ceil(f * max), 1), max);
  }
  function onMove(e: React.PointerEvent): void {
    if (!readonly) setHover(starAt(e));
  }
  function onLeave(): void {
    setHover(null);
  }
  function commit(e: React.PointerEvent): void {
    if (readonly) return;
    const v = starAt(e);
    // Click same star to clear one.
    onChange?.(value === v ? v - 1 : v);
  }
  function onKey(e: React.KeyboardEvent): void {
    if (readonly) return;
    let v = value;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") v = Math.min(v + 1, max);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") v = Math.max(v - 1, 0);
    else if (e.key === "Home") v = 0;
    else if (e.key === "End") v = max;
    else return;
    e.preventDefault();
    if (v !== value) onChange?.(v);
  }

  return (
    <span
      role={readonly ? "img" : "slider"}
      tabIndex={readonly ? undefined : 0}
      aria-label={label}
      aria-readonly={readonly || undefined}
      aria-valuemin={readonly ? undefined : 0}
      aria-valuemax={readonly ? undefined : max}
      aria-valuenow={readonly ? undefined : value}
      aria-valuetext={`${value} out of ${max}`}
      className={cn(
        "inline-flex rounded-sm outline-none",
        !readonly && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
      )}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={commit}
      onKeyDown={onKey}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          width: `${size * max}px`,
          height: `${size}px`,
          imageRendering: "pixelated",
        }}
      />
    </span>
  );
}
