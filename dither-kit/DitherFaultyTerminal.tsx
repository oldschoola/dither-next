"use client";

import { useEffect, useMemo, useRef } from "react";
import { paintFaultyTerminal, type FaultyTerminalParams } from "./faulty-terminal";
import { cn } from "./lib";
import {
  BAYER4,
  clamp01,
  fillOf,
  type PixelColor,
  pixelMatrixFromSeed,
  pixelPrefersReducedMotion,
} from "./pixel";
import {
  precompiledSrc,
  type DitherRenderMode,
  type PrecompiledDither,
} from "./precompile";
import { createRasterBuffer, putRasterBuffer, type RasterBuffer } from "./raster";
import { useCanvasVisibility } from "./use-visibility";

export type { FaultyTerminalParams } from "./faulty-terminal";
export { paintFaultyTerminal } from "./faulty-terminal";

export interface DitherFaultyTerminalProps {
  scale?: number;
  gridMul?: [number, number];
  digitSize?: number;
  timeScale?: number;
  pause?: boolean;
  scanlineIntensity?: number;
  glitchAmount?: number;
  flickerAmount?: number;
  noiseAmp?: number;
  chromaticAberration?: number;
  /** Ordered-dither threshold intensity: 0 smooth → 1 hard 1-bit Bayer.
   * `true` → 1, `false` → 0, number → clamped 0..1. */
  dither?: number | boolean;
  curvature?: number;
  tint?: PixelColor;
  mouseReact?: boolean;
  mouseStrength?: number;
  pageLoadAnimation?: boolean;
  brightness?: number;
  seed?: number;
  renderMode?: DitherRenderMode;
  precompiled?: PrecompiledDither;
  /** Tailwind class merge — mirrors the Vue `class` prop (guide §1). */
  class?: string;
}

// A background cell of ~3px keeps the fbm affordable; low caps because the
// wall is decorative and the pixelated upscale is part of the look.
const CELL = 3;
const MAX_COLS = 220;
const MAX_ROWS = 140;
const FRAME_MS = 33; // ~30fps cap — the wall breathes, it doesn't sprint
const LOAD_FADE_MS = 900;

/**
 * DitherFaultyTerminal — a CRT glyph wall rendered through the kit's own Bayer
 * engine (no WebGL). A grid of glyph cells is lit by animated value-noise/fbm,
 * then scanlines, glitch, flicker, chromatic aberration, barrel curvature, a
 * tint and ordered dithering run over it in one paint loop.
 *
 * React port of `dither-kit/FaultyTerminal.vue`. Unlike `DitherGradient` the
 * root is `relative h-full w-full` (self-sizing, NOT `absolute inset-0`), so
 * it fills its wrapper — give the wrapper a height, or pass
 * `class="absolute inset-0"` to use it as a background layer. This is why it
 * registers as an ordinary `COMPONENT_REGISTRY` entry in Studio's generic
 * widget renderer instead of a bespoke kind.
 *
 * Canvas rules (guide §9): `willReadFrequently: true` on the 2D context;
 * `RasterBuffer` + `putRasterBuffer`; the RAF loop is paused until the
 * IntersectionObserver reports the canvas visible, and a `restartToken` ref
 * guards against stale closures firing after a prop change restarted the
 * paint. `prefers-reduced-motion` paints a single settled frame.
 */
export function DitherFaultyTerminal({
  scale = 1.5,
  gridMul = [2, 1],
  digitSize = 1.2,
  timeScale = 1,
  pause = false,
  scanlineIntensity = 1,
  glitchAmount = 1,
  flickerAmount = 1,
  noiseAmp = 1,
  chromaticAberration = 0,
  dither = 0,
  curvature = 0,
  tint = "#ffffff",
  mouseReact = true,
  mouseStrength = 0.5,
  pageLoadAnimation = false,
  brightness = 1,
  seed,
  renderMode = "live",
  precompiled: precompiledProp,
  class: className,
}: DitherFaultyTerminalProps) {
  const precompiled = useMemo(() => precompiledSrc(precompiledProp), [precompiledProp]);

  // Resolved per-frame params — colors as rgb, grid split into x/y, dither
  // normalized to a 0..1 intensity (boolean → 0/1, number → clamped).
  const params = useMemo<FaultyTerminalParams>(
    () => ({
      scale,
      gridMulX: gridMul[0],
      gridMulY: gridMul[1],
      digitSize,
      scanlineIntensity,
      glitchAmount,
      flickerAmount,
      noiseAmp,
      chromaticAberration,
      dither: dither === true ? 1 : dither === false ? 0 : clamp01(dither),
      curvature,
      tint: fillOf(tint),
      brightness,
      mouseStrength,
    }),
    [
      scale,
      gridMul,
      digitSize,
      scanlineIntensity,
      glitchAmount,
      flickerAmount,
      noiseAmp,
      chromaticAberration,
      dither,
      curvature,
      tint,
      brightness,
      mouseStrength,
    ],
  );

  const matrix = useMemo(
    () => (seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4),
    [seed],
  );

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable paint state captured by the closures; refs survive renders so the
  // RAF loop always reads fresh values without re-subscribing on every prop
  // change. The loop effect (below) only re-subscribes on the structural
  // restart keys (seed/renderMode/precompiled/pageLoadAnimation) — same source
  // array as the Vue `watch([seed, renderMode, precompiled, pageLoadAnimation], start)`.
  // `renderMode` is read from the closure (it's a restart dep, so it's fresh
  // whenever the effect re-runs); `pause` is handled by the separate wake/stop
  // effect below so toggling it doesn't tear down the buffer.
  const stateRef = useRef({
    params,
    matrix,
    timeScale,
    pause,
    mouseReact,
    pageLoadAnimation,
    mouse: { x: 0.5, y: 0.5 },
  });
  stateRef.current = {
    params,
    matrix,
    timeScale,
    pause,
    mouseReact,
    pageLoadAnimation,
    mouse: stateRef.current.mouse, // preserve pointer across renders
  };

  // Pointer tracking — mirrors the Vue `onPointerMove` window listener. The
  // Vue SFC attached it to `window`; React does the same in an effect so a
  // wall of these mounting together shares one passive listener each (the
  // Vue version had the same per-instance cost).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPointerMove = (e: PointerEvent) => {
      const c = canvasRef.current;
      if (!c) return;
      const r = c.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      stateRef.current.mouse.x = (e.clientX - r.left) / r.width;
      stateRef.current.mouse.y = (e.clientY - r.top) / r.height;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  // `wake` restarts the RAF loop; the visibility hook calls it on re-entry.
  const wakeRef = useRef<(() => void) | undefined>(undefined);
  const restartToken = useRef(0);
  // `stop` cancels the running RAF without tearing down the buffer — the
  // Vue `watch(pause)` calls `stop()` on pause and `wake()` on resume.
  const stopRef = useRef<(() => void) | undefined>(undefined);
  const isVisible = useCanvasVisibility(wrapRef, () => wakeRef.current?.());
  // Restart loop on structural prop changes — mirrors the Vue
  // `watch([seed, renderMode, precompiled, pageLoadAnimation], start)`.
  // `pause` toggles are handled separately via the wake/stop effect below.
  useEffect(() => {
    if (precompiled) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const token = ++restartToken.current;
    let raf = 0;
    let ro: ResizeObserver | null = null;
    let buffer: RasterBuffer | null = null;
    let imageData: ImageData | undefined;
    let clock = 0;
    let loadStart = 0;
    let lastPaint = 0;

    const measure = (): CanvasRenderingContext2D | null => {
      if (!wrap || !canvas) return null;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      const box = wrap.getBoundingClientRect();
      const cols = Math.min(MAX_COLS, Math.max(8, Math.round(box.width / CELL)));
      const rows = Math.min(MAX_ROWS, Math.max(8, Math.round(box.height / CELL)));
      if (!buffer || buffer.width !== cols || buffer.height !== rows) {
        buffer = createRasterBuffer(cols, rows);
        imageData = undefined;
        canvas.width = cols;
        canvas.height = rows;
      }
      return ctx;
    };

    const paint = (ctx: CanvasRenderingContext2D, fade: number) => {
      if (!buffer) return;
      const s = stateRef.current;
      paintFaultyTerminal(
        buffer,
        s.params,
        clock,
        s.matrix,
        s.mouseReact ? s.mouse : null,
        fade,
      );
      imageData = putRasterBuffer(ctx, buffer, imageData);
    };

    const frame = (now: number) => {
      raf = 0;
      const s = stateRef.current;
      if (!isVisible() || s.pause || renderMode === "static") return;
      const ctx = measure();
      if (!ctx) return;
      if (now - lastPaint < FRAME_MS) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const dt = lastPaint ? Math.min(0.1, (now - lastPaint) / 1000) : 0;
      lastPaint = now;
      clock += dt * s.timeScale;
      if (!loadStart) loadStart = now;
      const fade = s.pageLoadAnimation ? clamp01((now - loadStart) / LOAD_FADE_MS) : 1;
      paint(ctx, fade);
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      const s = stateRef.current;
      if (!raf && !s.pause && renderMode !== "static" && isVisible()) {
        lastPaint = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    wakeRef.current = wake;
    // `stop` cancels the running RAF without tearing down the buffer or the
    // ResizeObserver — the Vue `watch(pause)` calls stop() on pause and
    // wake() on resume so a paused wall keeps its last frame and resumes
    // in place (no entrance replay).
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    wakeRef.current = wake;
    stopRef.current = stop;
    // effect runs after paint, so measure + paint directly.
    const ctx = measure();
    if (ctx) {
      if (renderMode === "static" || pixelPrefersReducedMotion()) {
        clock = 3;
        paint(ctx, 1);
      } else {
        paint(ctx, stateRef.current.pageLoadAnimation ? 0 : 1);
      }
    }

    // ResizeObserver repaints a paused/static frame (the live loop repaints
    // every tick, so it doesn't need the observer to trigger a paint).
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (raf) return; // live loop owns repaint
        const s = stateRef.current;
        if (s.pause || renderMode === "static") {
          const c = measure();
          if (c) paint(c, 1);
        }
      });
      ro.observe(wrap);
    }

    if (renderMode !== "static" && !pixelPrefersReducedMotion()) {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      restartToken.current = token + 1;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro?.disconnect();
      ro = null;
      wakeRef.current = undefined;
      stopRef.current = undefined;
    };
    // without re-subscribing (mirrors the Vue `watch` source array).
    // `isVisible` is a stable closure from the visibility hook.
  }, [precompiled, renderMode, pageLoadAnimation, seed, matrix, isVisible]);

  // Pause toggle — mirrors the Vue `watch(props.pause, paused => paused ? stop() : wake())`.
  useEffect(() => {
    if (pause) {
      stopRef.current?.();
    } else {
      wakeRef.current?.();
    }
  }, [pause]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className={cn("relative block h-full w-full overflow-hidden", className)}
    >
      {precompiled ? (
        <img
          src={precompiled}
          alt=""
          className="absolute inset-0 h-full w-full object-fill"
          style={{ imageRendering: "pixelated" }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ imageRendering: "pixelated" }}
        />
      )}
    </div>
  );
}
