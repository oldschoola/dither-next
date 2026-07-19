"use client";

import { useEffect, useRef, useState } from "react";

import { BAYER4, fillOf, type PixelColor } from "./pixel";
import { rgb } from "./palette";
import { cn } from "./lib";

export type NavMenuItem = { label: string; href?: string };

const CELL = 2;

/** Paint the 2px underline — the same horizontal dither ramp as DitherTabs.
 *  Verbatim port of the `paintUnderline` standalone helper in DitherNavMenu.vue. */
function paintUnderline(
  canvas: HTMLCanvasElement,
  width: number,
  color: PixelColor,
  matrix: number[][] = BAYER4,
): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || width <= 0) return;
  const cols = Math.max(4, Math.round(width / CELL));
  canvas.width = cols;
  canvas.height = 1;
  const fill = fillOf(color);
  ctx.clearRect(0, 0, cols, 1);
  for (let x = 0; x < cols; x++) {
    const density = (x + 0.5) / cols;
    const lit = density > matrix[0][x & 3];
    const alpha = lit ? 0.35 + 0.65 * density : 0.12 * density;
    if (alpha <= 0.004) continue;
    ctx.fillStyle = rgb(fill, 1, alpha);
    ctx.fillRect(x, 0, 1, 1);
  }
}

export interface DitherNavMenuProps {
  items: NavMenuItem[];
  /** Active item label (v-model). */
  value: string;
  color?: PixelColor;
  onValueChange?: (value: string) => void;
}

/**
 * DitherNavMenu — tabbed nav with an animated dithered underline that slides
 * to the active item. Verbatim port of DitherNavMenu.vue.
 *
 * `value`/`onValueChange` is the controlled contract (Vue `modelValue` +
 * `update:modelValue`, guide §4). The underline is a `willReadFrequently`
 * canvas positioned absolutely under the active item; `ResizeObserver` on the
 * list re-measures on layout change, and the underline re-measures + repaints
 * whenever `value`/`items`/`color` change (guide §9, §7).
 */
export function DitherNavMenu({
  items,
  value,
  color = "blue",
  onValueChange,
}: DitherNavMenuProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });
  // Keep the latest props in refs so the ResizeObserver callback (set up once)
  // reads current values without re-subscribing.
  const valueRef = useRef(value);
  valueRef.current = value;
  const colorRef = useRef(color);
  colorRef.current = color;

  function measure(): void {
    const idx = items.findIndex((it) => it.label === valueRef.current);
    const active = itemRefs.current[idx];
    if (!active) return;
    setUnderline({ left: active.offsetLeft, width: active.offsetWidth });
    if (canvasRef.current)
      paintUnderline(canvasRef.current, active.offsetWidth, colorRef.current);
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      measure();
      if (typeof ResizeObserver !== "undefined" && listRef.current) {
        const ro = new ResizeObserver(measure);
        ro.observe(listRef.current);
        return () => ro.disconnect();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Re-measure on value/items/color change (mirrors Vue `watch` + nextTick).
  useEffect(() => {
    measure();
  }, [value, items, color]);

  return (
    <nav className="relative">
      <div ref={listRef} className="flex gap-4">
        {items.map((item, i) => (
          <a
            key={item.label}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            href={item.href ?? "#"}
            aria-current={item.label === value ? "page" : undefined}
            className={cn(
              "pb-2 text-[12px] transition-colors focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none",
              item.label === value
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={(e) => {
              e.preventDefault();
              onValueChange?.(item.label);
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute bottom-0 h-[2px] transition-[left,width] duration-200 motion-reduce:transition-none"
        style={{
          left: `${underline.left}px`,
          width: `${underline.width}px`,
          imageRendering: "pixelated",
        }}
      />
    </nav>
  );
}
