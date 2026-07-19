"use client";

import { useEffect, useId, useRef } from "react";

import { BAYER4, fillOf, type PixelColor } from "./pixel";
import { rgb } from "./palette";
import { cn } from "./lib";

export type AccordionItem = { value: string; title: string };

const CELL = 2;

/** Paint the 2px left rail — a vertical dither ramp fading downward, the same
 *  recipe as DitherCollapsible. Verbatim port of the `paintRail` standalone
 *  helper in DitherAccordion.vue. */
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

export interface DitherAccordionProps {
  items: AccordionItem[];
  /** Controlled open state: `string` for single, `string[]` for multiple. */
  value: string | string[];
  type?: "single" | "multiple";
  color?: PixelColor;
  /** Named-slot content per item: `slots[item.value]` renders in that panel. */
  slots?: Record<string, React.ReactNode>;
  onChange?: (value: string | string[]) => void;
}

/**
 * DitherAccordion — controlled single/multiple expand with a dithered left rail.
 * Verbatim port of DitherAccordion.vue.
 *
 * `value`/`onChange` is the controlled contract (Vue `modelValue` +
 * `update:modelValue`, guide §4). Each item's content is a named slot keyed by
 * the item's `value`; the consumer passes them via `slots` (a record of
 * ReactNodes) since React named slots become named props.
 *
 * The rail canvas is painted after mount and re-painted on color change and on
 * `ResizeObserver` resize (guide §9: `willReadFrequently`, RAF-deferred
 * initial paint, RO in a single effect).
 */
export function DitherAccordion({
  items,
  value,
  type = "single",
  color = "blue",
  slots,
  onChange,
}: DitherAccordionProps) {
  const railsRef = useRef<(HTMLCanvasElement | null)[]>([]);
  // Track latest color in a ref so the ResizeObserver callback (set up once)
  // reads the current value without re-subscribing.
  const colorRef = useRef(color);
  colorRef.current = color;

  function isOpen(v: string): boolean {
    return Array.isArray(value) ? value.includes(v) : value === v;
  }

  function toggle(v: string): void {
    if (type === "single") {
      onChange?.(isOpen(v) ? "" : v);
      return;
    }
    const open = Array.isArray(value) ? value : value ? [value] : [];
    onChange?.(isOpen(v) ? open.filter((x) => x !== v) : [...open, v]);
  }

  // Initial paint (RAF-deferred) + ResizeObserver repaint, single effect.
  useEffect(() => {
    const token = requestAnimationFrame(() => {
      for (const canvas of railsRef.current) {
        if (canvas) paintRail(canvas, colorRef.current);
      }
      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver((entries) => {
          for (const entry of entries) {
            paintRail(entry.target as HTMLCanvasElement, colorRef.current);
          }
        });
        for (const canvas of railsRef.current) {
          if (canvas) ro.observe(canvas);
        }
        return () => ro.disconnect();
      }
    });
    return () => cancelAnimationFrame(token);
  }, []);

  // Repaint on color change.
  useEffect(() => {
    for (const canvas of railsRef.current) {
      if (canvas) paintRail(canvas, color);
    }
  }, [color]);

  const reactId = useId();

  return (
    <div>
      {items.map((item, i) => {
        const open = isOpen(item.value);
        return (
          <div
            key={item.value}
            className="border-t border-border/40 first:border-t-0"
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`${reactId}-${i}`}
              className="flex w-full items-center justify-between gap-2 py-2 text-left text-[13px] text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none"
              onClick={() => toggle(item.value)}
            >
              <span>{item.title}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
                  open ? "rotate-90" : "",
                )}
              >
                ›
              </span>
            </button>
            <div
              id={`${reactId}-${i}`}
              inert={!open}
              className="grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="flex gap-3 pt-1 pb-2">
                  <div className="relative w-[2px] self-stretch">
                    <canvas
                      ref={(el) => {
                        railsRef.current[i] = el;
                      }}
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                    {slots?.[item.value]}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
