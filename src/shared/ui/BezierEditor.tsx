"use client";

import { useCallback, useMemo, useRef } from "react";
import type { BezierPoints } from "@dither-kit";

export interface BezierEditorProps {
  value: BezierPoints;
  onChange?: (value: BezierPoints) => void;
}

// Screen space: x 0..1 spans the width; y -0.5..1.5 so overshoot is visible.
const W = 232;
const H = 148;
const Y_MIN = -0.5;
const Y_MAX = 1.5;
const sx = (x: number) => x * W;
const sy = (y: number) => ((Y_MAX - y) / (Y_MAX - Y_MIN)) * H;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// Animator staples — overshoot, anticipation, hard snap.
const PRESETS: { name: string; pts: BezierPoints }[] = [
  { name: "back", pts: [0.34, 1.56, 0.64, 1] },
  { name: "anticipate", pts: [0.36, 0, 0.66, -0.56] },
  { name: "snap", pts: [0.16, 1, 0.3, 1] },
];

/**
 * BezierEditor — draggable cubic-bezier control point editor. Verbatim port
 * of `src/shared/ui/BezierEditor.vue`.
 *
 * `v-model` → `value` / `onChange`. Window-level `pointermove`/`pointerup`
 * drag handlers (the Vue SFC attached them to `window` and removed on up)
 * stay on `window` so the drag survives leaving the SVG bounds.
 */
export function BezierEditor({ value, onChange }: BezierEditorProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const path = useMemo(
    () =>
      `M ${sx(0)} ${sy(0)} C ${sx(value[0])} ${sy(value[1])}, ${sx(value[2])} ${sy(value[3])}, ${sx(1)} ${sy(1)}`,
    [value],
  );

  const dragHandle = useCallback((which: 0 | 1, e: React.PointerEvent) => {
    e.preventDefault();
    const svg = svgRef.current;
    const cb = onChangeRef.current;
    if (!svg || !cb) return;

    const move = (ev: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      if (!r) return;
      const x = clamp((ev.clientX - r.left) / r.width, 0, 1);
      const y = clamp(
        Y_MAX - ((ev.clientY - r.top) / r.height) * (Y_MAX - Y_MIN),
        Y_MIN,
        Y_MAX,
      );
      const next: [number, number, number, number] = [...value] as never;
      next[which * 2] = Math.round(x * 100) / 100;
      next[which * 2 + 1] = Math.round(y * 100) / 100;
      cb(next);
    };
    move(e.nativeEvent);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [value]);

  function setNum(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    if (!Number.isFinite(v)) return;
    const next: [number, number, number, number] = [...value] as never;
    next[i] = clamp(v, i % 2 === 0 ? 0 : Y_MIN, i % 2 === 0 ? 1 : Y_MAX);
    onChange?.(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <svg
        ref={svgRef}
        width={W}
        height={H}
        className="w-full cursor-crosshair touch-none rounded-md bg-background/60 ring-1 ring-border"
        viewBox={`0 0 ${W} ${H}`}
      >
        {/* unit box + diagonal reference */}
        <rect
          x={sx(0)}
          y={sy(1)}
          width={W}
          height={sy(0) - sy(1)}
          className="fill-none stroke-border"
          strokeDasharray="3 3"
        />
        <line
          x1={sx(0)}
          y1={sy(0)}
          x2={sx(1)}
          y2={sy(1)}
          className="stroke-border"
          strokeDasharray="2 4"
        />
        {/* control arms */}
        <line x1={sx(0)} y1={sy(0)} x2={sx(value[0])} y2={sy(value[1])} className="stroke-accent/50" />
        <line x1={sx(1)} y1={sy(1)} x2={sx(value[2])} y2={sy(value[3])} className="stroke-accent/50" />
        {/* curve */}
        <path d={path} fill="none" className="stroke-foreground" strokeWidth={2} />
        {/* endpoints */}
        <circle cx={sx(0)} cy={sy(0)} r={3} className="fill-muted-foreground" />
        <circle cx={sx(1)} cy={sy(1)} r={3} className="fill-muted-foreground" />
        {/* draggable control points */}
        <circle
          cx={sx(value[0])}
          cy={sy(value[1])}
          r={6}
          className="cursor-grab fill-accent stroke-background active:cursor-grabbing"
          strokeWidth={2}
          onPointerDown={(e) => dragHandle(0, e)}
        />
        <circle
          cx={sx(value[2])}
          cy={sy(value[3])}
          r={6}
          className="cursor-grab fill-accent stroke-background active:cursor-grabbing"
          strokeWidth={2}
          onPointerDown={(e) => dragHandle(1, e)}
        />
      </svg>

      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-[10px] text-muted-foreground">cubic-bezier(</span>
        {value.map((v, i) => (
          <input
            key={i}
            type="number"
            name={`bezier-${i}`}
            step="0.01"
            value={v}
            className="w-full min-w-0 rounded border border-border bg-background/60 px-1 py-0.5 text-center text-[11px] tabular-nums text-foreground outline-none [appearance:textfield] focus:border-accent/60 [&::-webkit-inner-spin-button]:appearance-none"
            onChange={(e) => setNum(i, e)}
          />
        ))}
        <span className="shrink-0 text-[10px] text-muted-foreground">)</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {PRESETS.map((pr) => (
          <button
            key={pr.name}
            type="button"
            className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onChange?.(pr.pts)}
          >
            {pr.name}
          </button>
        ))}
      </div>
    </div>
  );
}
