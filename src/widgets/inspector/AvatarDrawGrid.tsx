"use client";

import { useMemo, useRef } from "react";
import type { AvatarModel } from "@/entities/widget";
import { clampGrid, cssColor, seededPattern } from "@dither-kit";

/** Click/drag pixel editor for drawn avatars. Verbatim port of
 * `src/widgets/inspector/AvatarDrawGrid.vue`.
 *
 * Symmetry follows the model's mirror setting (horizontal folds left/right,
 * vertical top/bottom, auto = free painting). In React the model is
 * immutable, so every paint routes through `onChange(producer)` which the
 * parent wires to `patchSelectedArtboard`. */

export interface AvatarDrawGridProps {
  avatar: AvatarModel;
  onChange: (producer: (a: AvatarModel) => void) => void;
}

export function AvatarDrawGrid({ avatar, onChange }: AvatarDrawGridProps) {
  const grid = clampGrid(avatar.grid);

  const cells = useMemo(() => {
    const n = grid * grid;
    const on = avatar.pattern?.on ?? [];
    return Array.from({ length: n }, (_, i) => !!on[i]);
  }, [avatar.pattern, grid]);

  const fill = avatar.autoColor
    ? "var(--color-foreground)"
    : cssColor(avatar.color);

  // The Vue SFC seeded the pattern in-place on first paint; in React we
  // synchronise it whenever draw becomes active without a valid pattern.
  // `seededRef` guards against re-seeding while the producer runs.
  const seededRef = useRef(false);

  function ensurePattern(a: AvatarModel) {
    const n = grid * grid;
    if (!a.pattern || a.pattern.on.length !== n) {
      // Seed the canvas-to-be from the current generative pattern so switching
      // to draw starts from something recognisable instead of a blank grid.
      const seeded = seededPattern(a.name, grid, a.mirror);
      a.pattern = {
        on: seeded.on.map((b) => (b ? 1 : 0)),
        density: seeded.density.map((d) => Math.round(d * 100) / 100),
      };
    }
  }

  function twinOf(i: number): number | null {
    const g = grid;
    const r = Math.floor(i / g);
    const c = i % g;
    if (avatar.mirror === "horizontal") return r * g + (g - 1 - c);
    if (avatar.mirror === "vertical") return (g - 1 - r) * g + c;
    return null;
  }

  // The drag target value — set on pointerdown from the clicked cell's state,
  // then reused while dragging across neighbours (same as the Vue SFC).
  const paintToRef = useRef<0 | 1>(1);

  function setCell(i: number, value: 0 | 1) {
    onChange((a) => {
      ensurePattern(a);
      const p = a.pattern!;
      p.on[i] = value;
      p.density[i] = p.density[i] || 0.85;
      const twin = twinOf(i);
      if (twin != null && twin !== i) {
        p.on[twin] = value;
        p.density[twin] = p.density[twin] || 0.85;
      }
    });
  }

  function onDown(i: number, e: React.PointerEvent) {
    e.preventDefault();
    // Resolve the current on-state from the avatar prop (the producer clones
    // asynchronously, so read the source).
    const cur = !!avatar.pattern?.on[i];
    paintToRef.current = cur ? 0 : 1;
    setCell(i, paintToRef.current);
  }

  function onEnter(i: number, e: React.PointerEvent) {
    if (e.buttons === 1) setCell(i, paintToRef.current);
  }

  function fillAll(value: 0 | 1) {
    onChange((a) => {
      ensurePattern(a);
      const p = a.pattern!;
      p.on = p.on.map(() => value);
    });
  }

  function invert() {
    onChange((a) => {
      ensurePattern(a);
      const p = a.pattern!;
      p.on = p.on.map((v) => (v ? 0 : 1));
    });
  }

  function reseed() {
    onChange((a) => {
      a.pattern = null;
      ensurePattern(a);
    });
  }

  // Reset the seeded guard when the avatar identity changes; not strictly
  // needed because `ensurePattern` re-checks the array length, but kept for
  // parity with the Vue SFC's lazy-init semantics.
  seededRef.current = false;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid aspect-square w-full touch-none select-none gap-px rounded-md bg-border/60 p-px ring-1 ring-border"
        style={{ gridTemplateColumns: `repeat(${grid}, 1fr)` }}
      >
        {cells.map((onCell, i) => (
          <button
            key={i}
            type="button"
            className="aspect-square rounded-[1px] transition-colors"
            style={{ backgroundColor: onCell ? fill : "var(--color-background)" }}
            aria-label={`Cell ${i + 1}`}
            onPointerDown={(e) => onDown(i, e)}
            onPointerEnter={(e) => onEnter(i, e)}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => fillAll(0)}
        >
          clear
        </button>
        <button
          type="button"
          className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => fillAll(1)}
        >
          fill
        </button>
        <button
          type="button"
          className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={invert}
        >
          invert
        </button>
        <button
          type="button"
          className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={reseed}
        >
          from seed
        </button>
      </div>
      <p className="text-[10px] leading-relaxed text-muted-foreground/70">
        click / drag to paint — mirror setting paints symmetrically
      </p>
    </div>
  );
}
