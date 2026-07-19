"use client";

import { useEffect, useRef } from "react";

import { cn } from "./lib";
import { BAYER4, fillOf, type PixelColor } from "./pixel";
import { rgb, type Rgb } from "./palette";

const CELL = 2;
let uid = 0;

/**
 * Paint the 2px left rail — a vertical dither ramp fading downward. Verbatim
 * port of DitherCollapsible.vue's standalone-script `paintRail`.
 */
function paintRail(
  canvas: HTMLCanvasElement,
  height: number,
  color: PixelColor,
  matrix: number[][] = BAYER4,
): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
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
    ctx.fillStyle = rgb(fill as Rgb, 1, alpha);
    ctx.fillRect(0, y, 1, 1);
  }
}

export interface DitherCollapsibleProps {
  title: string;
  /** Was `modelValue` (v-model). Parent-owned open state. */
  value?: boolean;
  /** Was `update:modelValue`. Called with the next open state on toggle. */
  onChange?: (value: boolean) => void;
  color?: PixelColor;
  children?: React.ReactNode;
}

/**
 * DitherCollapsible — a disclosure with a 2px dithered left rail. Controlled:
 * the parent owns `value` (open) and receives toggles via `onChange` (the
 * Vue kit's `modelValue` + `update:modelValue` pair, per guide §4).
 *
 * The rail is canvas-backed (`willReadFrequently`), repainted on resize via
 * `ResizeObserver` with mount paint deferred to `requestAnimationFrame`
 * (guide §9 rule 4). The content uses a CSS `grid-template-rows: 1fr/0fr`
 * expand transition (kept mounted, never unmounts on toggle) and the `inert`
 * attribute gates focus when collapsed.
 *
 * `prefers-reduced-motion` is honored via Tailwind's `motion-reduce:`
 * variant on the transition classes (same as the Vue kit).
 */
export function DitherCollapsible({
  title,
  value = false,
  onChange,
  color = "blue",
  children,
}: DitherCollapsibleProps) {
  const railRef = useRef<HTMLCanvasElement | null>(null);
  // Stable unique id linking the trigger button to the content region.
  const idRef = useRef(`dither-collapsible-${++uid}`);
  const id = idRef.current;
  // Track color in a ref so the mount-once RO callback reads the latest value.
  const colorRef = useRef(color);
  colorRef.current = color;

  useEffect(() => {
    const canvas = railRef.current;
    if (!canvas) return;

    function paint(): void {
      const cv = railRef.current;
      if (cv) paintRail(cv, cv.offsetHeight, colorRef.current);
    }

    let ro: ResizeObserver | null = null;
    const raf = requestAnimationFrame(() => {
      paint();
      if (typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(paint);
        ro.observe(canvas);
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  return (
    <div>
      <button
        type="button"
        aria-expanded={value}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-2 py-2 text-left text-[13px] text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none"
        onClick={() => onChange?.(!value)}
      >
        <span>{title}</span>
        <span
          aria-hidden="true"
          className={cn(
            "text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
            value ? "rotate-90" : "",
          )}
        >
          ›
        </span>
      </button>
      <div
        id={id}
        inert={!value ? true : undefined}
        className="grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none"
        style={{ gridTemplateRows: value ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex gap-3 pt-1 pb-2">
            <div className="relative w-[2px] self-stretch">
              <canvas
                ref={railRef}
                aria-hidden="true"
                className="absolute inset-0 h-full w-full"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted-foreground">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
