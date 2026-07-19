"use client";

import { useEffect, useRef, useState } from "react";
import type { Artboard } from "@/entities/artboard";
import {
  getEditorSnapshot,
  selectArtboard,
  setArtboardPositions,
  setArtboardRect,
  setGuides,
  useEditor,
} from "@/entities/editor";
import { startDrag } from "@/features/artboard-transform";
import { ChartRenderer } from "@/widgets/chart-renderer";
import { WidgetRenderer } from "@/widgets/widget-renderer";
import { cn } from "@/shared/lib";

export interface ArtboardFrameProps {
  artboard: Artboard;
}

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface HandleDef {
  dir: ResizeDir;
  cls: string;
}

const HANDLES: HandleDef[] = [
  { dir: "nw", cls: "-left-1.5 -top-1.5 cursor-nwse-resize" },
  { dir: "n", cls: "-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { dir: "ne", cls: "-right-1.5 -top-1.5 cursor-nesw-resize" },
  { dir: "e", cls: "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize" },
  { dir: "se", cls: "-bottom-1.5 -right-1.5 cursor-nwse-resize" },
  { dir: "s", cls: "-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { dir: "sw", cls: "-bottom-1.5 -left-1.5 cursor-nesw-resize" },
  { dir: "w", cls: "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize" },
];

const additive = (e: PointerEvent): boolean =>
  e.metaKey || e.ctrlKey || e.shiftKey;

const interactive = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  !!target.closest(
    "button, a, input, textarea, select, [contenteditable], [role='button'], [role='link'], [data-canvas-interactive]",
  );

/**
 * Artboard — a single frame on the infinite canvas. Verbatim port of
 * `src/widgets/canvas/Artboard.vue`.
 *
 * Owns the surface selection + move/resize drag interactions. Move snaps the
 * whole selection's edges/centers against the other (non-selected, visible)
 * artboards and writes transient guides into the editor store (cleared on
 * drag end). Resize uses 8 handles with shift-to-constrain aspect on corners;
 * n/w anchors move the origin. Widget frames allow smaller minimums than
 * chart frames.
 *
 * Reads selection reactively via `useEditor`; reads everything else from the
 * snapshot inside pointer handlers (handlers don't re-subscribe — guide §2,
 * CONVERSION-GUIDE.md §11). `interacting` toggles the live position readout
 * in the title label.
 */
export function ArtboardFrame({ artboard }: ArtboardFrameProps) {
  const selected = useEditor((s) => s.selectedIds.includes(artboard.id));
  const [interacting, setInteracting] = useState(false);
  // startDrag returns a cleanup fn; keep it in a ref so we can tear it down
  // before starting a new drag and on unmount (guide §2 onMounted/Unmount pair).
  const stopDragRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    return () => {
      stopDragRef.current?.();
    };
  }, []);

  const onSurfaceDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (additive(e.nativeEvent)) {
      selectArtboard(artboard.id, true);
      return;
    }
    // Snapshot read: handlers must not depend on the reactive `selected` closure
    // value (which is stale across pointer lifecycle), so read fresh here.
    if (!getEditorSnapshot().selectedIds.includes(artboard.id)) {
      selectArtboard(artboard.id);
    }
    const target = e.target as Element | null;
    if (
      target instanceof Element &&
      target.closest("[data-artboard-surface]") === target &&
      !interactive(e.nativeEvent.target)
    ) {
      onMoveDown(e.nativeEvent);
    }
  };

  /** Drag with edge/center snapping against the other artboards. Moves the
   *  whole selection; guides render in the canvas while a snap is active. */
  const onMoveDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    const snap = getEditorSnapshot();
    if (!snap.selectedIds.includes(artboard.id)) {
      selectArtboard(artboard.id, additive(e));
    }
    if (artboard.locked) return;

    const moving = snap.artboards.filter(
      (a) => snap.selectedIds.includes(a.id) && !a.locked,
    );
    const others = snap.artboards.filter(
      (a) => !snap.selectedIds.includes(a.id) && !a.hidden,
    );
    const starts = new Map(moving.map((a) => [a.id, { x: a.x, y: a.y }]));
    const meStart = { x: artboard.x, y: artboard.y };
    const { w, h } = artboard;
    let accX = 0;
    let accY = 0;
    setInteracting(true);
    stopDragRef.current?.();
    stopDragRef.current = startDrag(
      e,
      (dx, dy) => {
        accX += dx;
        accY += dy;
        const z = getEditorSnapshot().viewport.zoom || 1;
        const threshold = 6 / z;
        const rawX = meStart.x + accX;
        const rawY = meStart.y + accY;
        let sx = 0;
        let sy = 0;
        let gv: number | null = null;
        let gh: number | null = null;
        let bestX = threshold;
        let bestY = threshold;
        for (const o of others) {
          for (const ox of [o.x, o.x + o.w / 2, o.x + o.w]) {
            for (const mx of [rawX, rawX + w / 2, rawX + w]) {
              const d = ox - mx;
              if (Math.abs(d) < bestX) {
                bestX = Math.abs(d);
                sx = d;
                gv = ox;
              }
            }
          }
          for (const oy of [o.y, o.y + o.h / 2, o.y + o.h]) {
            for (const my of [rawY, rawY + h / 2, rawY + h]) {
              const d = oy - my;
              if (Math.abs(d) < bestY) {
                bestY = Math.abs(d);
                sy = d;
                gh = oy;
              }
            }
          }
        }
        setArtboardPositions(
          moving.map((a) => {
            const s = starts.get(a.id)!;
            return { id: a.id, x: s.x + accX + sx, y: s.y + accY + sy };
          }),
        );
        setGuides({ v: gv, h: gh });
      },
      () => {
        setGuides({ v: null, h: null });
        setInteracting(false);
        stopDragRef.current = undefined;
      },
    );
  };

  const onMoveDownReact = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    onMoveDown(e.nativeEvent);
  };

  // 8-direction resize with shift-to-constrain (corner handles keep the
  // starting aspect ratio). Widget frames allow smaller minimums than charts.
  const onResizeDown = (dir: ResizeDir, e: PointerEvent): void => {
    const snap = getEditorSnapshot();
    if (!snap.selectedIds.includes(artboard.id)) selectArtboard(artboard.id);
    if (artboard.locked) return;
    const start = { x: artboard.x, y: artboard.y, w: artboard.w, h: artboard.h };
    const ratio = start.w / start.h;
    const minW = artboard.widget ? 100 : 260;
    const minH = artboard.widget ? 60 : 200;
    let ax = 0;
    let ay = 0;
    setInteracting(true);
    stopDragRef.current?.();
    stopDragRef.current = startDrag(
      e,
      (_dx, _dy, ev) => {
        ax += _dx;
        ay += _dy;
        let w = start.w;
        let h = start.h;
        if (dir.includes("e")) w = start.w + ax;
        if (dir.includes("w")) w = start.w - ax;
        if (dir.includes("s")) h = start.h + ay;
        if (dir.includes("n")) h = start.h - ay;
        // Shift on a corner: constrain to the starting aspect ratio, following
        // whichever axis moved further.
        if (ev.shiftKey && dir.length === 2) {
          if (Math.abs(ax) * start.h > Math.abs(ay) * start.w) h = w / ratio;
          else w = h * ratio;
        }
        w = Math.max(minW, Math.round(w));
        h = Math.max(minH, Math.round(h));
        const x = dir.includes("w") ? start.x + (start.w - w) : start.x;
        const y = dir.includes("n") ? start.y + (start.h - h) : start.y;
        setArtboardRect(artboard.id, { x, y, w, h }, minW, minH);
      },
      () => {
        setInteracting(false);
        stopDragRef.current = undefined;
      },
    );
  };

  return (
    <div
      className="absolute"
      data-artboard-id={artboard.id}
      style={{
        left: `${artboard.x}px`,
        top: `${artboard.y}px`,
        width: `${artboard.w}px`,
        height: `${artboard.h}px`,
      }}
      onPointerDown={onSurfaceDown}
    >
      <div
        className={cn(
          "absolute -top-6 left-0 flex max-w-full select-none items-center gap-1.5 truncate text-[11px]",
          selected ? "text-accent" : "text-muted-foreground",
          artboard.locked ? "cursor-default" : "cursor-move",
        )}
        onPointerDown={onMoveDownReact}
      >
        {artboard.locked ? (
          <svg
            viewBox="0 0 24 24"
            className="size-3 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        ) : null}
        <span className="truncate">{artboard.name}</span>
        <span className="tabular-nums text-muted-foreground/60">
          {interacting
            ? `${Math.round(artboard.x)}, ${Math.round(artboard.y)} · `
            : ""}
          {artboard.w}×{artboard.h}
        </span>
      </div>

      <div
        data-artboard-surface
        className={cn(
          "h-full w-full rounded-lg bg-card/60 p-3",
          selected ? "ring-2 ring-accent" : "border border-border",
        )}
      >
        {artboard.widget ? (
          <WidgetRenderer widget={artboard.widget} artboardId={artboard.id} />
        ) : (
          <div data-canvas-interactive className="h-full">
            <ChartRenderer chart={artboard.chart} />
          </div>
        )}
      </div>

      {selected && !artboard.locked
        ? HANDLES.map((hd) => (
            <div
              key={hd.dir}
              className={cn(
                "absolute z-10 size-3 rounded-[2px] border border-accent bg-background",
                hd.cls,
              )}
              onPointerDown={(e) => {
                e.stopPropagation();
                onResizeDown(hd.dir, e.nativeEvent);
              }}
            />
          ))
        : null}
    </div>
  );
}
