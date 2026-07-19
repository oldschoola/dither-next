"use client";

import { getEditorSnapshot, setViewport } from "@/entities/editor";
import type { Artboard } from "@/entities/artboard";
import type { RefObject } from "react";

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
const MIN = 0.2;
const MAX = 3;

export interface ZoomControls {
  onWheel: (e: WheelEvent) => void;
  startPan: (e: PointerEvent) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fit: () => void;
  fitSelection: () => void;
}

/** Canvas pan + cursor-anchored zoom over the editor viewport. Wheel pans;
 * ctrl/cmd-wheel (or pinch) zooms to the cursor; drag on empty canvas pans.
 *
 * Port of `src/features/pan-zoom/usePanZoom.ts`. The Vue version mutated
 * `editor.viewport` fields directly; here we read the current snapshot and
 * call `setViewport` with a new object. The hook returns stable controls bound
 * to the host element's rect. */
export function usePanZoom(host: RefObject<HTMLElement | null>): ZoomControls {
  const zoomTo = (next: number, cx: number, cy: number): void => {
    const v = getEditorSnapshot().viewport;
    const clamped = clamp(next, MIN, MAX);
    const k = clamped / v.zoom;
    setViewport({
      zoom: clamped,
      x: cx - (cx - v.x) * k,
      y: cy - (cy - v.y) * k,
    });
  };

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = host.current?.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) {
      const cx = e.clientX - (rect?.left ?? 0);
      const cy = e.clientY - (rect?.top ?? 0);
      zoomTo(getEditorSnapshot().viewport.zoom * (1 - e.deltaY * 0.0015), cx, cy);
    } else {
      const v = getEditorSnapshot().viewport;
      setViewport({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
    }
  };

  const startPan = (e: PointerEvent): void => {
    if (e.button !== 0 && e.button !== 1) return;
    let px = e.clientX;
    let py = e.clientY;
    const move = (ev: PointerEvent): void => {
      const v = getEditorSnapshot().viewport;
      setViewport({
        ...v,
        x: v.x + (ev.clientX - px),
        y: v.y + (ev.clientY - py),
      });
      px = ev.clientX;
      py = ev.clientY;
    };
    const up = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const center = (): { cx: number; cy: number } => {
    const rect = host.current?.getBoundingClientRect();
    return { cx: (rect?.width ?? 0) / 2, cy: (rect?.height ?? 0) / 2 };
  };
  const zoomIn = (): void => {
    const { cx, cy } = center();
    zoomTo(getEditorSnapshot().viewport.zoom * 1.2, cx, cy);
  };
  const zoomOut = (): void => {
    const { cx, cy } = center();
    zoomTo(getEditorSnapshot().viewport.zoom / 1.2, cx, cy);
  };
  const resetZoom = (): void => setViewport({ zoom: 1, x: 96, y: 88 });

  /** Frame the given artboards in the viewport (never zooms past 100%). */
  const frame = (abs: { x: number; y: number; w: number; h: number }[]): void => {
    const rect = host.current?.getBoundingClientRect();
    if (!rect) return;
    if (!abs.length) {
      resetZoom();
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const a of abs) {
      minX = Math.min(minX, a.x);
      minY = Math.min(minY, a.y - 28); // room for the title label
      maxX = Math.max(maxX, a.x + a.w);
      maxY = Math.max(maxY, a.y + a.h);
    }
    const pad = 96;
    const cw = maxX - minX || 1;
    const ch = maxY - minY || 1;
    const z = clamp(Math.min((rect.width - pad) / cw, (rect.height - pad) / ch), MIN, 1);
    setViewport({
      zoom: z,
      x: (rect.width - cw * z) / 2 - minX * z,
      y: (rect.height - ch * z) / 2 - minY * z,
    });
  };

  const fit = (): void => frame(getEditorSnapshot().artboards);
  const fitSelection = (): void => {
    const s = getEditorSnapshot();
    const sel = s.artboards.filter((a) => s.selectedIds.includes(a.id)) as Artboard[];
    frame(sel.length ? sel : s.artboards);
  };

  return { onWheel, startPan, zoomIn, zoomOut, resetZoom, fit, fitSelection };
}
