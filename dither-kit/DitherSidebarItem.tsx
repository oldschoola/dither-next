"use client";

import { useEffect, useRef } from "react";

import { BAYER4, fillOf, type PixelColor } from "./pixel";
import { cssColor, rgb } from "./palette";
import { useSidebar } from "./sidebar-context";

/** 2px dithered rail marking the active item — same recipe as the tabs
 *  underline. Verbatim port of the `paintRail` standalone helper in
 *  DitherSidebarItem.vue. */
function paintRail(
  canvas: HTMLCanvasElement,
  color: PixelColor,
  cssHeight: number,
  matrix: number[][] = BAYER4,
): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const rows = Math.max(4, Math.round(cssHeight / 2));
  canvas.width = 1;
  canvas.height = rows;
  const fill = fillOf(color);
  for (let y = 0; y < rows; y++) {
    const k = 0.55 + 0.45 * (1 - Math.abs(y / rows - 0.5) * 2);
    if (k > matrix[y & 3][0] * 0.9) {
      ctx.fillStyle = rgb(fill, 1, k);
      ctx.fillRect(0, y, 1, 1);
    }
  }
}

export interface DitherSidebarItemProps {
  label: string;
  active?: boolean;
  color?: PixelColor;
  /** Right-aligned count — folds to a colored dot on the icon rail. */
  badge?: string | number;
  onSelect?: () => void;
  /** Icon slot (left of the label). */
  icon?: React.ReactNode;
}

/**
 * DitherSidebarItem — sidebar row with an active-state dithered rail. Verbatim
 * port of DitherSidebarItem.vue.
 *
 * Consumes `SidebarContext` (collapsed + compact) via `useSidebar()` (guide
 * §3). The rail canvas is `willReadFrequently`, painted on mount and
 * re-painted on active/color change (RAF-deferred, guide §9). On the icon rail
 * the label and badge fold away (the badge becomes a colored dot).
 */
export function DitherSidebarItem({
  label,
  active = false,
  color = "blue",
  badge,
  onSelect,
  icon,
}: DitherSidebarItemProps) {
  const { collapsed, compact } = useSidebar();
  const railRef = useRef<HTMLCanvasElement | null>(null);
  function paint(): void {
    const c = railRef.current;
    if (c && active) paintRail(c, color, 24);
  }

  useEffect(() => {
    paint();
  }, [active, color]);

  // Re-paint on active/color change via RAF (mirrors the Vue
  // `watch(() => [active, color], () => requestAnimationFrame(paint))`).
  useEffect(() => {
    const id = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(id);
    // `active` and `color` are read inside `paint` via closure; re-run when
    // they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, color]);

  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      title={collapsed ? label : undefined}
      className={[
        "relative flex items-center rounded-md text-left font-mono transition-colors",
        compact ? "h-7 gap-2 px-2 text-[11px]" : "h-8 gap-2.5 px-2.5 text-[12px]",
        active
          ? "bg-card text-foreground"
          : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
      ].join(" ")}
      onClick={() => onSelect?.()}
    >
      {active ? (
        <canvas
          ref={railRef}
          aria-hidden="true"
          className="absolute inset-y-1.5 left-0 w-[2px]"
          style={{ imageRendering: "pixelated" }}
        />
      ) : null}
      <span className="grid size-4 shrink-0 place-items-center" aria-hidden="true">
        {icon ?? <span className="size-1.5 rounded-[1px] bg-current opacity-70" />}
      </span>
      {!collapsed ? (
        <span className="min-w-0 flex-1 truncate">{label}</span>
      ) : null}
      {badge !== undefined && !collapsed ? (
        <span className="shrink-0 rounded border border-border/60 px-1 text-[10px] text-muted-foreground tabular-nums">
          {badge}
        </span>
      ) : null}
      {badge !== undefined && collapsed ? (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 size-1.5 rounded-full"
          style={{ backgroundColor: cssColor(color) }}
        />
      ) : null}
    </button>
  );
}
