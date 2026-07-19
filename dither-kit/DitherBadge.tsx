"use client";

import { useEffect, useRef } from "react";

import { kitFromSeed } from "./dither-paint";
import { cn } from "./lib";
import { BAYER4, clamp01, fillOf, pixelMatrixFromSeed, type PixelColor } from "./pixel";
import { rgb, type Rgb } from "./palette";

export type BadgeVariant = "gradient" | "solid" | "dotted" | "hatched";

const CELL = 2;

/**
 * DitherButton's fill at rest intensity — texture capped by the 1px brighter
 * edge lines, no hover machinery. Verbatim port of DitherBadge.vue's
 * standalone-script `paintBadge`.
 */
function paintBadge(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  fill: Rgb,
  variant: BadgeVariant,
  matrix: number[][] = BAYER4,
): void {
  ctx.clearRect(0, 0, cols, rows);
  const bias = variant === "dotted" ? 0.12 : 0;
  for (let y = 0; y < rows; y++) {
    const density =
      variant === "gradient"
        ? 0.25 + 0.75 * ((y + 0.5) / rows)
        : variant === "dotted"
          ? 0.5
          : 0.75;
    for (let x = 0; x < cols; x++) {
      if (variant === "hatched" && ((x + y) & 3) >= 2) continue;
      const lit = variant === "solid" || density > matrix[y & 3][x & 3] - bias;
      if (variant === "dotted" && !lit) continue;
      const k = 0.3 + density * 0.7;
      ctx.fillStyle = rgb(fill, 1, clamp01(lit ? k : k * 0.4));
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = rgb(fill, 1, 0.5);
  ctx.fillRect(0, 0, cols, 1);
  ctx.fillRect(0, rows - 1, cols, 1);
  ctx.fillRect(0, 0, 1, rows);
  ctx.fillRect(cols - 1, 0, 1, rows);
}

export interface DitherBadgeProps {
  color?: PixelColor;
  variant?: BadgeVariant;
  seed?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * DitherBadge — a dither-textured badge with 4 variants (gradient / solid /
 * dotted / hatched). Canvas-backed with a `willReadFrequently` context;
 * `ResizeObserver` repaints on size change. Explicit `color`/`variant` props
 * win; otherwise a `seed` derives them via `kitFromSeed` (hue + variant) and
 * `pixelMatrixFromSeed` (the dither matrix). No animation loop — the texture
 * is static once painted, so `prefers-reduced-motion` is irrelevant here.
 *
 * Mount-time paint is deferred to `requestAnimationFrame` to avoid forced
 * reflow when many components mount together (guide §9 rule 4).
 */
export function DitherBadge({
  color,
  variant,
  seed,
  className,
  children,
}: DitherBadgeProps) {
  // Derive color/variant/matrix from seed when no explicit prop is given.
  // Done in render (not an effect) per guide §2 rule 4 — these are pure
  // derivations of props, the Vue kit's `computed` shape.
  const s = seed !== undefined ? kitFromSeed(seed) : null;
  const matrix = seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4;
  const effColor: PixelColor = color ?? s?.hue ?? "blue";
  const effVariant: BadgeVariant = variant ?? s?.variant ?? "gradient";

  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Refs hold the latest derived values so the mount-once effect + RO callback
  // read fresh values without re-subscribing on every prop change.
  const colorRef = useRef(effColor);
  colorRef.current = effColor;
  const variantRef = useRef(effVariant);
  variantRef.current = effVariant;
  const matrixRef = useRef(matrix);
  matrixRef.current = matrix;

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
      const cols = Math.max(4, Math.round(box.width / CELL));
      const rows = Math.max(4, Math.round(box.height / CELL));
      cv.width = cols;
      cv.height = rows;
      paintBadge(
        ctx,
        cols,
        rows,
        fillOf(colorRef.current),
        variantRef.current,
        matrixRef.current,
      );
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

  return (
    <span
      ref={wrapRef}
      className={cn(
        "relative isolate inline-flex items-center overflow-hidden rounded px-2 py-0.5 font-mono text-[10px] text-foreground",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
      {children}
    </span>
  );
}
