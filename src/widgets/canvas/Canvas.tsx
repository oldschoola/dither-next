import { useEffect, useRef, useState } from "react";
import { addArtboard, deselect, getEditorSnapshot, selectMany, useEditor } from "@/entities/editor";
import { useShortcuts } from "@/features/keyboard";
import { usePanZoom } from "@/features/pan-zoom";
import { cn } from "@/shared/lib";
import { ArtboardFrame } from "./Artboard";
import styles from "./Canvas.module.css";

interface Marquee {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const isTyping = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  return (
    !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
  );
};

/**
 * Canvas — the infinite pan/zoom surface hosting the artboards. Verbatim port
 * of `src/widgets/canvas/Canvas.vue`.
 *
 * - Wheel/drag pan + cursor-anchored zoom via `usePanZoom(host)`.
 * - Space-to-pan (Figma convention): plain drag on empty canvas = marquee.
 * - Marquee selection on empty-canvas drag (`onPointerDown` guarded by
 *   `e.target === e.currentTarget`, the Vue `.self` modifier — guide §5).
 * - Snap guides are world coords rendered to screen using the viewport.
 * - Zoom controls bar; empty state with an "Add artboard" button.
 *
 * `useShortcuts(zoom)` installs window-level keyboard shortcuts; the host ref
 * is passed to `usePanZoom` so wheel/centering read the live rect. The marquee
 * move handler reads the editor via `getEditorSnapshot()` (NOT the reactive
 * `useEditor` value, which is captured at handler creation and goes stale
 * across the pointer lifecycle — guide §2, CONVERSION-GUIDE.md §11).
 */
export function Canvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const zoom = usePanZoom(hostRef);
  useShortcuts(zoom);

  const artboards = useEditor((s) => s.artboards);
  const viewport = useEditor((s) => s.viewport);
  const guides = useEditor((s) => s.guides);

  const visible = artboards.filter((a) => !a.hidden);

  // Space-to-pan (Figma convention): plain drag on empty canvas = marquee.
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [marquee, setMarquee] = useState<Marquee | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === " " && !isTyping(e.target)) setSpaceHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.key === " ") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Marquee selection on empty-canvas drag.
  const onCanvasDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    // Vue `.self` modifier: only fire when the pointer lands on the host itself.
    if (e.target !== e.currentTarget) return;
    if (e.button === 1 || spaceHeld) {
      zoom.startPan(e.nativeEvent);
      return;
    }
    if (e.button !== 0) return;
    const rect = hostRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    setMarquee({ x1: sx, y1: sy, x2: sx, y2: sy });

    const move = (ev: PointerEvent): void => {
      const x2 = ev.clientX - rect.left;
      const y2 = ev.clientY - rect.top;
      setMarquee({ x1: sx, y1: sy, x2, y2 });
      const s = getEditorSnapshot();
      const v = s.viewport;
      const wx1 = (Math.min(sx, x2) - v.x) / v.zoom;
      const wy1 = (Math.min(sy, y2) - v.y) / v.zoom;
      const wx2 = (Math.max(sx, x2) - v.x) / v.zoom;
      const wy2 = (Math.max(sy, y2) - v.y) / v.zoom;
      const hit = s.artboards.filter(
        (a) =>
          !a.hidden &&
          !a.locked &&
          a.x < wx2 &&
          a.x + a.w > wx1 &&
          a.y < wy2 &&
          a.y + a.h > wy1,
      );
      selectMany(hit.map((a) => a.id));
    };
    const up = (ev: PointerEvent): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const moved = Math.hypot(ev.clientX - rect.left - sx, ev.clientY - rect.top - sy);
      if (moved < 3) deselect(); // plain click on empty canvas
      setMarquee(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>): void => {
    // usePanZoom.onWheel calls preventDefault; React's onWheel is passive by
    // default so we hand it the native event directly.
    zoom.onWheel(e.nativeEvent);
  };

  return (
    <div
      ref={hostRef}
      className={cn(
        "dk-canvas relative h-full w-full overflow-hidden",
        styles.host,
        spaceHeld && "cursor-grab",
      )}
      onWheel={onWheel}
      onPointerDown={onCanvasDown}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {visible.map((a) => (
          <ArtboardFrame key={a.id} artboard={a} />
        ))}
      </div>

      {/* Snap guides (world coords -> screen) */}
      {guides.v != null ? (
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-accent/70"
          style={{ left: `${guides.v * viewport.zoom + viewport.x}px` }}
        />
      ) : null}
      {guides.h != null ? (
        <div
          className="pointer-events-none absolute inset-x-0 h-px bg-accent/70"
          style={{ top: `${guides.h * viewport.zoom + viewport.y}px` }}
        />
      ) : null}

      {/* Marquee */}
      {marquee ? (
        <div
          className="pointer-events-none absolute border border-accent/70 bg-accent/10"
          style={{
            left: `${Math.min(marquee.x1, marquee.x2)}px`,
            top: `${Math.min(marquee.y1, marquee.y2)}px`,
            width: `${Math.abs(marquee.x2 - marquee.x1)}px`,
            height: `${Math.abs(marquee.y2 - marquee.y1)}px`,
          }}
        />
      ) : null}

      {/* Empty state */}
      {artboards.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">No artboards yet.</p>
          <button
            type="button"
            className="pointer-events-auto rounded-md bg-accent px-3 py-1.5 text-xs text-accent-foreground transition-opacity hover:opacity-90"
            onClick={() => addArtboard("area")}
          >
            + Add artboard
          </button>
        </div>
      ) : null}

      {/* Zoom controls */}
      <div className="pointer-events-auto absolute bottom-3 left-3 flex items-center gap-0.5 rounded-lg border border-border/70 bg-background/95 p-1 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.24)]">
        <button
          type="button"
          aria-label="Zoom out"
          className={styles.zoomTool}
          title="Zoom out (⌘−)"
          onClick={zoom.zoomOut}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Reset zoom to 100%"
          className="w-12 rounded-md py-1 text-center tabular-nums text-muted-foreground transition-colors hover:text-foreground active:scale-[0.96]"
          title="Reset to 100% (⌘0)"
          onClick={zoom.resetZoom}
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          className={styles.zoomTool}
          title="Zoom in (⌘+)"
          onClick={zoom.zoomIn}
        >
          +
        </button>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <button
          type="button"
          aria-label="Fit to screen"
          className={styles.zoomTool}
          title="Fit (⇧1)"
          onClick={zoom.fit}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
