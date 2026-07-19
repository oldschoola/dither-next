"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { project, rubberband, velocityFrom, type VelocitySample } from "./gesture";
import { pixelPrefersReducedMotion } from "./pixel";
import { cn } from "./lib";
import { DrawerChannelContext, useDrawerChannel } from "./drawer-channel";
import { useInDom } from "./use-in-dom";
import { usePresence } from "./use-presence";
import styles from "./overlay-transitions.module.css";

export type DrawerSide = "right" | "left" | "bottom";

export interface DitherDrawerProps {
  open: boolean;
  side?: DrawerSide;
  title?: string;
  /** Swipe-to-dismiss gesture on the panel. */
  swipe?: boolean;
  /** Bottom sheets only: preset visible heights (0..1 viewport fraction, >1 px). */
  snapPoints?: number[];
  /** Active snap point (v-model:snapPoint). Defaults to the first. */
  snapPoint?: number;
  /** false renders no backdrop and leaves the page interactive. */
  modal?: boolean;
  /** false keeps the drawer open on backdrop clicks (Escape still closes). */
  dismissible?: boolean;
  onClose?: () => void;
  onSnapPointChange?: (snapPoint: number) => void;
  children?: React.ReactNode;
}

/** Snap points: 0..1 = fraction of viewport height, >1 = px. Verbatim from Vue.
 *  SSR guard: during prerender `window` is undefined; fractional snaps fall
 *  back to 0 (the portal is not rendered on the server anyway via `useInDom`). */
function resolveSnap(s: number): number {
  if (typeof window === "undefined") return s <= 1 ? 0 : s;
  return s <= 1 ? s * window.innerHeight : s;
}

/**
 * DitherDrawer — swipeable drawer/sheet (HIGHEST-risk component, guide §10).
 * Verbatim port of DitherDrawer.vue.
 *
 * Gesture contract (dither-kit/AGENTS.md): 1:1 pointer tracking with
 * `setPointerCapture`, rubber-band against the dismiss direction, velocity sign
 * decides a flick, projection decides a slow drag. All math lives in
 * `./gesture` (`project`/`rubberband`/`velocityFrom`) — never re-derived here.
 *
 * Nesting: a child drawer pushes its parent back via `DrawerChannelContext`
 * (the Vue `DRAWER_CHANNEL` provide/inject). `DitherDrawerIndent` provides it
 * at the app root; each `DitherDrawer` both consumes (notifies parent) and
 * provides (receives child notifications) — see `childOpen`.
 *
 * Bottom-sheet snap points: the projected visible height picks the nearest
 * snap; below half the smallest snap = dismiss. Side drawers use velocity +
 * projection thresholds.
 *
 * Portal renders to `document.body`; backdrop + panel each have their own
 * presence transition (guide §6). `prefers-reduced-motion` skips the dismiss
 * animation and closes immediately.
 */
export function DitherDrawer({
  open,
  side = "right",
  title,
  swipe = true,
  snapPoints,
  snapPoint,
  modal = true,
  dismissible = true,
  onClose,
  onSnapPointChange,
  children,
}: DitherDrawerProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  // --- nesting: push this drawer back while a child drawer is open ----------
  const parent = useDrawerChannel();
  const [childOpen, setChildOpen] = useState(0);
  // Provide a fresh channel to descendants. `notify` is stable via useCallback.
  const notify = useCallback((d: number) => {
    setChildOpen((c) => c + d);
  }, []);
  const channelValue = useMemo(() => ({ notify }), [notify]);

  // Tell the parent when our open state flips. `immediate: true` in Vue → this
  // effect also runs on mount. On unmount, if we were open, notify -1.
  const openRef = useRef(open);
  useEffect(() => {
    if (parent && open !== openRef.current) parent.notify(open ? 1 : -1);
    openRef.current = open;
  }, [parent, open]);
  useEffect(() => {
    return () => {
      if (parent && openRef.current) parent.notify(-1);
    };
  }, [parent]);

  // Focus the close button when opening a modal drawer (Vue nextTick → rAF).
  useEffect(() => {
    if (!open || !modal) return;
    const id = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, modal]);

  // --- snap points (bottom sheets) -----------------------------------------
  const hasSnaps =
    side === "bottom" && !!snapPoints && snapPoints.length > 0;
  const [internalSnap, setInternalSnap] = useState<number | null>(null);
  const activeSnap = snapPoint ?? internalSnap ?? snapPoints?.[0] ?? 1;

  // Reset internal snap when opening.
  useEffect(() => {
    if (open) setInternalSnap(snapPoint ?? snapPoints?.[0] ?? null);
  }, [open, snapPoint, snapPoints]);

  const maxSnapPx = useMemo(
    () => (hasSnaps && snapPoints ? Math.max(...snapPoints.map(resolveSnap)) : 0),
    [hasSnaps, snapPoints],
  );
  const activeSnapPx = hasSnaps ? resolveSnap(activeSnap) : 0;
  // Resting translateY for the current snap: hide everything below it.
  const snapBase = hasSnaps ? maxSnapPx - activeSnapPx : 0;

  const setSnap = useCallback(
    (s: number) => {
      setInternalSnap(s);
      onSnapPointChange?.(s);
    },
    [onSnapPointChange],
  );

  // --- swipe: 1:1 tracking, rubber-band, momentum projection ---------------
  const axis = side === "bottom" ? "y" : "x";
  const dismissSign = side === "left" ? -1 : 1;
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(0); // px toward dismissal (negative = upward / rubber-banded)
  const [offset, setOffset] = useState(0);
  const settleMsRef = useRef(200);
  const [settleMs, setSettleMs] = useState(200);
  const startRef = useRef(0);
  const sizeRef = useRef(320);
  const samplesRef = useRef<VelocitySample[]>([]);

  const pos = (e: React.PointerEvent) =>
    axis === "y" ? e.clientY : e.clientX;

  function onDown(e: React.PointerEvent): void {
    if (!swipe || childOpen > 0) return;
    const t = e.target as HTMLElement;
    if (t.closest("button, a, input, textarea, select, [data-no-swipe]")) return;
    const panel = panelRef.current;
    if (!panel) return;
    draggingRef.current = true;
    setDragging(true);
    startRef.current = pos(e);
    sizeRef.current = axis === "y" ? panel.offsetHeight : panel.offsetWidth;
    samplesRef.current = [{ t: e.timeStamp, p: pos(e) }];
    panel.setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent): void {
    if (!draggingRef.current) return;
    samplesRef.current.push({ t: e.timeStamp, p: pos(e) });
    if (samplesRef.current.length > 6) samplesRef.current.shift();
    const d = (pos(e) - startRef.current) * dismissSign;
    let next: number;
    if (hasSnaps) {
      // Upward headroom until the largest snap, rubber-band past it.
      const headroom = snapBase;
      next = d >= -headroom ? d : -headroom - rubberband(-d - headroom, sizeRef.current);
    } else {
      next = d >= 0 ? d : -rubberband(-d, sizeRef.current);
    }
    offsetRef.current = next;
    setOffset(next);
  }
  function onUp(): void {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const v = velocityFrom(samplesRef.current) * dismissSign;
    // A hard flick settles faster — scale the release duration by swipe strength.
    const newSettle = Math.round(200 * Math.min(1, Math.max(0.3, 1 - Math.abs(v) / 3000)));
    settleMsRef.current = newSettle;
    setSettleMs(newSettle);
    const projected = offsetRef.current + project(v);

    if (hasSnaps && snapPoints) {
      // Projected visible height picks the snap; below half the smallest = dismiss.
      const projectedVisible = activeSnapPx - projected;
      const snaps = snapPoints;
      const smallest = Math.min(...snaps.map(resolveSnap));
      if (projectedVisible < smallest * 0.5) {
        dismiss();
        return;
      }
      const nearest = snaps.reduce((a, b) =>
        Math.abs(resolveSnap(b) - projectedVisible) <
        Math.abs(resolveSnap(a) - projectedVisible)
          ? b
          : a,
      );
      setSnap(nearest);
      offsetRef.current = 0;
      setOffset(0);
      return;
    }

    // Velocity sign decides on a flick; projection decides on a slow drag.
    if (offsetRef.current > 0 && (v > 500 || (projected > sizeRef.current * 0.5 && v > -100))) {
      dismiss();
    } else {
      offsetRef.current = 0;
      setOffset(0);
    }
  }
  function dismiss(): void {
    if (pixelPrefersReducedMotion()) {
      offsetRef.current = 0;
      setOffset(0);
      onClose?.();
      return;
    }
    offsetRef.current = sizeRef.current * 1.05;
    setOffset(sizeRef.current * 1.05);
    window.setTimeout(() => {
      onClose?.();
      offsetRef.current = 0;
      setOffset(0);
    }, settleMsRef.current);
  }

  // 0..1 how far the drawer has been swiped toward dismissal.
  const progress = Math.min(
    1,
    Math.max(0, (snapBase + offset) / (hasSnaps ? maxSnapPx : sizeRef.current || 1)),
  );

  const panelStyle: React.CSSProperties = useMemo(() => {
    if (childOpen > 0) {
      const push =
        side === "bottom"
          ? "translateY(10px)"
          : `translateX(${12 * dismissSign}px)`;
      return { transform: `${push} scale(0.97)`, filter: "brightness(0.75)" };
    }
    const style: React.CSSProperties = { transitionDuration: `${settleMs}ms` };
    if (hasSnaps) style.height = `${maxSnapPx}px`;
    const delta = snapBase + offset;
    if (delta !== 0) {
      style.transform =
        axis === "y"
          ? `translateY(${delta}px)`
          : `translateX(${offset * dismissSign}px)`;
    }
    return style;
  }, [childOpen, side, dismissSign, settleMs, hasSnaps, maxSnapPx, snapBase, offset, axis]);

  const backdropMounted = usePresence(open && modal, 200);
  const panelMounted = usePresence(open, 200);
  const inDom = useInDom();

  if (!inDom) return null;

  const slideHideClass =
    side === "bottom"
      ? styles.slideBottomHide
      : side === "right"
        ? styles.slideRightHide
        : styles.slideLeftHide;
  const slideClass =
    side === "bottom" ? styles.slideBottom : side === "right" ? styles.slideRight : styles.slideLeft;

  return createPortal(
    <DrawerChannelContext value={channelValue}>
      {backdropMounted && modal ? (
        <div
          aria-hidden="true"
          className={cn(
            styles.fadeBackdrop,
            "fixed inset-0 z-50 bg-black/60",
            !open && styles.fadeHide,
          )}
          style={{
            opacity: dragging || offset > 0 ? 1 - progress : undefined,
            transition: dragging ? "none" : undefined,
          }}
          onClick={() => {
            if (dismissible) onClose?.();
          }}
        />
      ) : null}
      {panelMounted ? (
        <div
          ref={panelRef as React.RefObject<HTMLDivElement | null>}
          role="dialog"
          aria-modal={modal ? "true" : undefined}
          aria-label={title}
          className={cn(
            slideClass,
            "fixed z-50 flex flex-col border-border bg-card p-4",
            side === "bottom"
              ? "inset-x-0 bottom-0 rounded-t-xl border-t"
              : "inset-y-0 w-80 max-w-[85vw]",
            side === "bottom" && !hasSnaps ? "max-h-[85vh]" : "",
            side === "right"
              ? "right-0 border-l"
              : side === "left"
                ? "left-0 border-r"
                : "",
            dragging ? "select-none" : "transition-[transform,filter] motion-reduce:transition-none",
            swipe && side !== "bottom" ? "touch-pan-y" : "",
            !open && slideHideClass,
          )}
          style={panelStyle}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onClose?.();
            }
          }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {side === "bottom" ? (
            <div
              aria-hidden="true"
              className="mx-auto mb-3 h-1 w-10 shrink-0 touch-none rounded-full bg-border"
            />
          ) : null}
          <div className="flex touch-none items-center justify-between gap-2 pb-3">
            <span className="text-sm font-medium">{title}</span>
            <button
              ref={closeRef}
              type="button"
              className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:outline-none"
              aria-label="Close"
              onClick={() => onClose?.()}
            >
              ×
            </button>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto"
            data-no-swipe={side === "bottom" ? true : undefined}
          >
            {children}
          </div>
        </div>
      ) : null}
    </DrawerChannelContext>,
    document.body,
  );
}
