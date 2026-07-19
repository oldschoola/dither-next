"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { kitFromSeed } from "./dither-paint";
import { cn } from "./lib";
import { BAYER4, fillOf, pixelMatrixFromSeed, type PixelColor } from "./pixel";
import { rgb, type Rgb } from "./palette";

export type TabsVariant = "underline" | "segmented" | "washed";
export type TabItem = {
  value: string;
  label?: string;
  badge?: string | number;
  disabled?: boolean;
};

/**
 * Tabs context — the Vue kit's `TABS_CTX` InjectionKey. `DitherTabs`
 * provides; `DitherTabPanel` consumes. `active` is the parent-owned selected
 * value (the `value` prop), and `idBase` links tabs ↔ panels for a11y.
 */
export type TabsContextValue = { active: string; idBase: string };
export const TabsContext = createContext<TabsContextValue | null>(null);

/** Boundary-guarded accessor mirroring the Vue kit's `inject(TABS_CTX, null)`
 * + null check. Throws (at render, like Vue) when used outside a tabs root. */
export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("DitherTabPanel must be used within <DitherTabs>.");
  }
  return ctx;
}

const CELL = 2;

/**
 * Underline: a dither ramp along the run (same recipe as the gradient fade).
 * Verbatim port of DitherTabs.vue's standalone-script `paintUnderline`.
 */
function paintUnderline(
  canvas: HTMLCanvasElement,
  length: number,
  color: PixelColor,
  vertical: boolean,
  matrix: number[][],
) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || length <= 0) return;
  const cells = Math.max(4, Math.round(length / CELL));
  canvas.width = vertical ? 1 : cells;
  canvas.height = vertical ? cells : 1;
  const fill = fillOf(color);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < cells; i++) {
    const density = (i + 0.5) / cells;
    const lit = density > matrix[0][i & 3];
    const alpha = lit ? 0.35 + 0.65 * density : 0.12 * density;
    if (alpha <= 0.004) continue;
    ctx.fillStyle = rgb(fill as Rgb, 1, alpha);
    if (vertical) ctx.fillRect(0, i, 1, 1);
    else ctx.fillRect(i, 0, 1, 1);
  }
}

/**
 * Washed: a quiet rest-intensity fill behind the active tab. Verbatim port of
 * DitherTabs.vue's standalone-script `paintWash`.
 */
function paintWash(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  color: PixelColor,
  matrix: number[][],
) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || w <= 0 || h <= 0) return;
  const cols = Math.max(4, Math.round(w / CELL));
  const rows = Math.max(4, Math.round(h / CELL));
  canvas.width = cols;
  canvas.height = rows;
  const fill = fillOf(color);
  ctx.clearRect(0, 0, cols, rows);
  for (let y = 0; y < rows; y++) {
    const density = 0.2 + 0.5 * ((y + 0.5) / rows);
    for (let x = 0; x < cols; x++) {
      const lit = density > matrix[y & 3][x & 3];
      ctx.fillStyle = rgb(fill as Rgb, 1, lit ? 0.32 : 0.08);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = rgb(fill as Rgb, 1, 0.5);
  ctx.fillRect(0, rows - 1, cols, 1);
}

export interface DitherTabsProps {
  /** Plain strings or { value, label, badge, disabled } items. */
  tabs: (string | TabItem)[];
  /** Was `modelValue` (v-model). Parent-owned selected value. */
  value: string;
  /** Was `update:modelValue`. Called with the newly selected value. */
  onChange?: (value: string) => void;
  color?: PixelColor;
  /** underline: moving dither strip · segmented: boxed chips · washed: dither fill. */
  variant?: TabsVariant;
  orientation?: "horizontal" | "vertical";
  seed?: number;
  class?: string;
  /** Panels: put DitherTabPanel children here so they inherit the context. */
  children?: React.ReactNode;
}

/**
 * DitherTabs — a tab list with a dithered active marker (underline strip,
 * boxed chip, or washed fill). Controlled: the parent owns `value` and
 * receives selection changes via `onChange` (guide §4 v-model mapping).
 *
 * The marker is canvas-backed (`willReadFrequently`), measured from the
 * active tab button's offset box and repainted on resize via
 * `ResizeObserver` (mount measure deferred to `requestAnimationFrame`,
 * guide §9). Keyboard navigation roves the enabled tabs (Arrow/Home/End)
 * with roving `tabindex`. `prefers-reduced-motion` is honored via Tailwind's
 * `motion-reduce:` variant on the marker's position transition.
 *
 * Provides `TabsContext` so `DitherTabPanel` children can link id/aria and
 * toggle visibility without a separate prop drill (guide §3).
 */
export function DitherTabs({
  tabs,
  value,
  onChange,
  color,
  variant = "underline",
  orientation = "horizontal",
  seed,
  class: className,
  children,
}: DitherTabsProps) {
  // Seed-derived color/matrix (explicit props win). Pure render derivation.
  const s = seed !== undefined ? kitFromSeed(seed) : null;
  const effColor: PixelColor = color ?? s?.hue ?? "blue";
  const matrix = seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4;
  const vertical = orientation === "vertical";

  // Stable id base linking tabs ↔ panels (SSR-safe: useId is tree-position
  // based, so server and client produce identical ids — unlike the Vue kit's
  // module-level counter which diverges across SSR/client module instances).
  const idBase = `dk-tabs-${useId()}`;

  // Normalize tabs to TabItem[] once per render (cheap).
  const items: TabItem[] = useMemo(
    () => tabs.map((t) => (typeof t === "string" ? { value: t } : t)),
    [tabs],
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Array of tab button refs (roving tabindex + measure + focus target).
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [marker, setMarker] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  // Latest values for the mount-once measure/RO closure.
  const valueRef = useRef(value);
  valueRef.current = value;
  const variantRef = useRef(variant);
  variantRef.current = variant;
  const verticalRef = useRef(vertical);
  verticalRef.current = vertical;
  const effColorRef = useRef(effColor);
  effColorRef.current = effColor;
  const matrixRef = useRef(matrix);
  matrixRef.current = matrix;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const measure = useCallback(() => {
    if (variantRef.current === "segmented") return;
    const curItems = itemsRef.current;
    const i = curItems.findIndex((t) => t.value === valueRef.current);
    const btn = tabRefs.current[i];
    const canvas = canvasRef.current;
    if (!btn || !canvas) return;
    setMarker({
      left: btn.offsetLeft,
      top: btn.offsetTop,
      width: btn.offsetWidth,
      height: btn.offsetHeight,
    });
    if (variantRef.current === "washed") {
      paintWash(canvas, btn.offsetWidth, btn.offsetHeight, effColorRef.current, matrixRef.current);
    } else {
      paintUnderline(
        canvas,
        verticalRef.current ? btn.offsetHeight : btn.offsetWidth,
        effColorRef.current,
        verticalRef.current,
        matrixRef.current,
      );
    }
  }, []);

  const select = useCallback(
    (v: string) => {
      onChange?.(v);
    },
    [onChange],
  );

  const onKeydown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const fwd = verticalRef.current ? "ArrowDown" : "ArrowRight";
      const back = verticalRef.current ? "ArrowUp" : "ArrowLeft";
      const curItems = itemsRef.current;
      const enabled = curItems
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => !t.disabled);
      const pos = enabled.findIndex(({ t }) => t.value === valueRef.current);
      let next = -1;
      if (e.key === fwd) next = (pos + 1) % enabled.length;
      else if (e.key === back) next = (pos - 1 + enabled.length) % enabled.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = enabled.length - 1;
      else return;
      e.preventDefault();
      const target = enabled[next];
      select(target.t.value);
      // Focus the newly-selected tab. The button persists across re-renders
      // (roving tabindex shifts, the element doesn't remount), so we focus it
      // directly — Vue used nextTick; React needs no defer here since the ref
      // is stable. Use a microtask to let the parent's re-render commit first
      // so tabindex updates before focus lands.
      queueMicrotask(() => tabRefs.current[target.i]?.focus());
    },
    [select],
  );

  // Mount-once: initial measure (deferred to RAF) + ResizeObserver.
  useEffect(() => {
    const list = listRef.current;
    let ro: ResizeObserver | null = null;
    const raf = requestAnimationFrame(() => {
      measure();
      if (typeof ResizeObserver !== "undefined" && list) {
        ro = new ResizeObserver(measure);
        ro.observe(list);
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [measure]);

  // Re-measure when any input that moves the marker changes. UseLayoutEffect
  // so the marker repaints before paint (the Vue kit used nextTick; guide §7
  // maps a nextTick+DOM-read-after-state to useLayoutEffect when in a
  // watcher/effect — here the state is the parent's `value` prop).
  useEffect(() => {
    measure();
  }, [value, tabs, effColor, variant, orientation, matrix, measure]);

  // Set a tab button ref by index (array-ref pattern, guide §7).
  const setTabRef = useCallback(
    (i: number) => (el: HTMLButtonElement | null) => {
      tabRefs.current[i] = el;
    },
    [],
  );

  const markerStyle = useMemo(() => {
    if (variant === "washed") {
      return {
        left: `${marker.left}px`,
        top: `${marker.top}px`,
        width: `${marker.width}px`,
        height: `${marker.height}px`,
      };
    }
    return vertical
      ? { left: "0px", top: `${marker.top}px`, width: "2px", height: `${marker.height}px` }
      : { left: `${marker.left}px`, bottom: "0px", width: `${marker.width}px`, height: "2px" };
  }, [variant, vertical, marker]);

  const ctxValue = useMemo<TabsContextValue>(
    () => ({ active: value, idBase }),
    [value, idBase],
  );

  return (
    <TabsContext value={ctxValue}>
      <div className={cn("relative", vertical ? "flex gap-4" : "", className)}>
        <div
          ref={listRef}
          role="tablist"
          aria-orientation={orientation}
          className={cn(
            vertical ? "flex flex-col" : "flex",
            variant === "segmented"
              ? "gap-1 rounded-md border border-border/60 p-1" +
                  (vertical ? "" : " items-center")
              : variant === "underline"
                ? vertical
                  ? "gap-1 pl-3"
                  : "gap-4"
                : "gap-1",
          )}
          onKeyDown={onKeydown}
        >
          {items.map((t, i) => (
            <button
              key={t.value}
              id={`${idBase}-tab-${t.value}`}
              ref={setTabRef(i)}
              type="button"
              role="tab"
              aria-selected={t.value === value}
              aria-controls={`${idBase}-panel-${t.value}`}
              tabIndex={t.value === value ? 0 : -1}
              disabled={t.disabled}
              className={cn(
                "relative z-10 flex items-center gap-1.5 text-[12px] transition-colors focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
                variant === "underline"
                  ? vertical
                    ? "rounded-md px-2 py-1.5 text-left"
                    : "pb-2"
                  : "rounded px-2.5 py-1 text-left",
                t.value === value
                  ? variant === "segmented"
                    ? "bg-card text-foreground"
                    : "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => select(t.value)}
            >
              {t.label ?? t.value}
              {t.badge !== undefined && (
                <span className="rounded border border-border/60 px-1 text-[10px] text-muted-foreground tabular-nums">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        {variant !== "segmented" && (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={cn(
              "absolute transition-[left,top,width,height] duration-200 motion-reduce:transition-none",
              variant === "washed" ? "rounded" : "",
            )}
            style={{ ...markerStyle, imageRendering: "pixelated" } as React.CSSProperties}
          />
        )}
        {/* Panels: put DitherTabPanel children here so they inherit the context. */}
        {children}
      </div>
    </TabsContext>
  );
}
