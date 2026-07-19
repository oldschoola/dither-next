"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  SPINNER_DEFAULT,
  spinnerFromSeed,
  type SpinnerParams,
} from "./dither-paint";
import {
  precompiledSrc,
  type DitherRenderMode,
  type PrecompiledDither,
} from "./precompile";
import {
  BAYER4,
  fillOf,
  pixelMatrixFromSeed,
  pixelPrefersReducedMotion,
  type PixelColor,
} from "./pixel";
import { rgb, type Rgb } from "./palette";
import {
  clearRasterBuffer,
  createRasterBuffer,
  putRasterBuffer,
  setOrBlendRasterPixel,
  type RasterBuffer,
} from "./raster";
import { useCanvasVisibility } from "./use-visibility";

const CELL = 2;
const TAU = Math.PI * 2;

/**
 * Perimeter coordinate 0..1 walking a unit-square outline, continuous across
 * corners — the square's answer to a circle's angle. Verbatim port of
 * DitherSpinner.vue's standalone-script `squareT`.
 */
function squareT(sx: number, sy: number): number {
  const ax = Math.abs(sx);
  const ay = Math.abs(sy);
  if (sy < 0 && ay >= ax) return (sx + 1) / 8; // top L→R
  if (sx > 0 && ax >= ay) return 0.25 + (sy + 1) / 8; // right T→B
  if (sy > 0 && ay >= ax) return 0.5 + (1 - sx) / 8; // bottom R→L
  return 0.75 + (1 - sy) / 8; // left B→T
}

/**
 * One frame — walk every cell, resolve its outline membership + path coord by
 * SHAPE, its brightness by FLOW, then carve detail and dither. `phase` (0..1)
 * advances over time. Verbatim port of DitherSpinner.vue's `paintSpinner`.
 *
 * Accepts either a CanvasRenderingContext2D (per-pixel fillRect) or a
 * RasterBuffer (fast source-over blend via setOrBlendRasterPixel) — the kit
 * uses the RasterBuffer path for the spinner's animation loop.
 */
function paintSpinner(
  ctx: CanvasRenderingContext2D | RasterBuffer,
  cells: number,
  fill: Rgb,
  phase: number,
  matrix: number[][] = BAYER4,
  p: SpinnerParams = SPINNER_DEFAULT,
): void {
  if ("data" in ctx) clearRasterBuffer(ctx);
  else ctx.clearRect(0, 0, cells, cells);
  const c = cells / 2;
  const half = c - 0.5;
  const arc = Math.max(0.05, Math.min(1, p.arc));
  const ph = (((phase * p.dir) % 1) + 1) % 1;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const nx = (x + 0.5 - c) / half; // -1..1
      const ny = (y + 0.5 - c) / half;
      // SHAPE: membership on the outline + path coordinate t (0..1) + angle.
      let lit: boolean;
      let t: number;
      let ang: number;
      if (p.shape === 1) {
        const d = Math.max(Math.abs(nx), Math.abs(ny));
        lit = d >= p.innerRatio && d <= 1;
        t = squareT(nx / (d || 1), ny / (d || 1));
        ang = t * TAU;
      } else if (p.shape === 2) {
        lit = Math.abs(ny) <= 0.4 && Math.abs(nx) <= 1;
        t = (nx + 1) / 2;
        ang = t * TAU;
      } else {
        const r = Math.hypot(nx, ny);
        lit = r >= p.innerRatio && r <= 1;
        ang = (Math.atan2(ny, nx) + TAU) % TAU;
        t = ang / TAU;
      }
      if (!lit) continue;
      // FLOW: brightness along the outline.
      let bright: number;
      if (p.flow === 1) {
        bright = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(ph * TAU)); // breathe
      } else if (p.flow === 2) {
        bright = (0.5 + 0.5 * Math.sin((t * p.waveCount - ph) * TAU)) ** 1.6; // travelling
      } else {
        const rel = (((t - ph) % 1) + 1) % 1; // sweep head at ph
        bright = rel <= arc ? 1 - p.taper * (rel / arc) : 0;
      }
      // DETAIL: dashes along the outline, radial petals on round shapes.
      if (p.segments > 0 && (t * p.segments) % 1 > 0.6) bright = 0;
      if (p.spokes > 0 && p.shape !== 2)
        bright *= 0.35 + 0.65 * Math.abs(Math.cos((ang * p.spokes) / 2)) ** 2;
      if (bright <= 0 || bright <= matrix[y & 3][x & 3]) continue;
      const alpha = 0.4 + 0.6 * bright;
      if ("data" in ctx) setOrBlendRasterPixel(ctx, x, y, fill, alpha);
      else {
        ctx.fillStyle = rgb(fill, 1, alpha);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

export interface DitherSpinnerProps {
  size?: number;
  color?: PixelColor;
  seed?: number;
  renderMode?: DitherRenderMode;
  precompiled?: PrecompiledDither;
}

/**
 * DitherSpinner — a generative spinner, a point in a continuous form space
 * rather than a preset (per dither-kit/AGENTS.md). Three axes are seeded
 * independently via `spinnerFromSeed` (foundation, NOT re-derived here):
 *   • SHAPE  — circle ring / square box-ring / bar (each pixel gets a path
 *              coord t in 0..1 walking that outline).
 *   • FLOW   — sweep comet / pulse breathe / travelling wave.
 *   • DETAIL — arc/taper/segments/spokes/innerRatio carving the lit pattern.
 * ONE render loop (`paintSpinner`) draws any point; widen the axes, never
 * branch per preset.
 *
 * Canvas with `willReadFrequently` + a `RasterBuffer` backing store for the
 * `putImageData` writes. The RAF loop is visibility-gated
 * (`useCanvasVisibility` / IntersectionObserver): it PAUSES while off-screen
 * and resumes its SAME closure on re-entry (no entrance replay, no state
 * loss — guide §9 rule 2). `prefers-reduced-motion` freezes it at the first
 * frame (guide §9 rule 3). `renderMode="static"` also disables the loop. A
 * `precompiled` image short-circuits to an `<img>` (same fallback shape as
 * DitherButton/DitherGradient).
 */
export function DitherSpinner({
  size = 20,
  color = "blue",
  seed,
  renderMode = "live",
  precompiled: precompiledProp,
}: DitherSpinnerProps) {
  const spin = seed !== undefined ? spinnerFromSeed(seed) : SPINNER_DEFAULT;
  const matrix = seed !== undefined ? pixelMatrixFromSeed(seed) : BAYER4;
  const precompiled = precompiledSrc(precompiledProp);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Per-instance wake slot: the RAF effect (re-mounted on prop change) stores
  // its resume closure here; the visibility hook's `onWake` calls it when the
  // element re-enters view. A ref (not state) so resuming doesn't re-render.
  const wakeRef = useRef<(() => void) | null>(null);
  // Stable `onWake` passed to `useCanvasVisibility` — identity never changes,
  // so the IO observer is set up once and reads the latest wake via the ref.
  const onWake = useCallback(() => {
    wakeRef.current?.();
  }, []);
  const isVisible = useCanvasVisibility(canvasRef, onWake);

  // Latest props in refs so the effect closure reads fresh values. The effect
  // re-runs on the watched sources below (the Vue kit's `watch(flush:post)`
  // restart pattern collapses to a single effect keyed on those sources).
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const matrixRef = useRef(matrix);
  matrixRef.current = matrix;

  // `restartToken` guards against a stale RAF closure firing after a prop
  // change restarted the loop (the Vue kit's restartToken pattern, guide §9).
  const restartToken = useRef(0);

  useEffect(() => {
    // If a precompiled image is in use, there is no canvas loop to run.
    if (precompiled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const token = ++restartToken.current;

    const fill = fillOf(color);
    const cells = Math.max(8, Math.round(size / CELL));
    canvas.width = cells;
    canvas.height = cells;

    let raf = 0;
    let last = 0;
    const buffer = createRasterBuffer(cells, cells);
    let imageData: ImageData | undefined;

    const frame = (now: number) => {
      raf = 0;
      if (token !== restartToken.current) return; // superseded by a restart
      if (!isVisible()) return; // off-screen: pause the loop
      if (now - last < 33) {
        // ~30fps cap (matches the Vue kit's 33ms throttle) — a spinner reads
        // smoothly at 30fps and halves the paint cost vs 60fps.
        raf = requestAnimationFrame(frame);
        return;
      }
      last = now;
      paintSpinner(
        buffer,
        cells,
        fill,
        (now * spinRef.current.speed) % 1,
        matrixRef.current,
        spinRef.current,
      );
      imageData = putRasterBuffer(ctx, buffer, imageData);
      raf = requestAnimationFrame(frame);
    };

    // First frame — painted synchronously so the spinner is never blank.
    paintSpinner(buffer, cells, fill, 0, matrixRef.current, spinRef.current);
    imageData = putRasterBuffer(ctx, buffer, imageData);

    // The `wake` callback resumes the paused loop when the element re-enters
    // view; `useCanvasVisibility` invokes `onWake` on the IO intersecting
    // transition, which calls this via the per-instance wakeRef.
    wakeRef.current = () => {
      if (!raf && token === restartToken.current) {
        raf = requestAnimationFrame(frame);
      }
    };

    const reduce = pixelPrefersReducedMotion();
    const staticMode = renderMode === "static";
    if (!reduce && !staticMode) {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      // Invalidate this closure so a late `wake` no-ops; a restarted effect
      // will bump the token again and install its own wake.
      restartToken.current += 1;
      if (raf) cancelAnimationFrame(raf);
      if (wakeRef.current) wakeRef.current = null;
    };
  }, [size, color, seed, renderMode, precompiled, isVisible]);

  if (precompiled) {
    return (
      <span role="status" aria-label="Loading" className="inline-flex">
        {/* eslint-disable-next-line @next/next/no-img-element -- precompiled
            dither bitmap, not a managed asset. */}
        <img
          src={precompiled}
          alt=""
          style={{
            width: `${size}px`,
            height: `${size}px`,
            imageRendering: "pixelated",
          }}
        />
      </span>
    );
  }

  return (
    <span role="status" aria-label="Loading" className="inline-flex">
      <canvas
        ref={canvasRef}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          imageRendering: "pixelated",
        }}
      />
    </span>
  );
}
