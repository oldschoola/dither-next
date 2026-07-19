"use client";

import { useMemo } from "react";

import { cn } from "./lib";
import { xorshift32 } from "./pixel";
import styles from "./DitherSkeleton.module.css";

/**
 * DitherSkeleton — a CSS-only shimmer loading affordance. (The Vue kit drove this
 * with a canvas RAF loop; per the Feedback workstream brief it is CSS-only
 * here, which removes the RAF/IntersectionObserver cost entirely while
 * keeping the same visual: a muted field with a travelling highlight.)
 *
 * `seed` deterministically varies the sweep duration and phase so a field of
 * seeded skeletons doesn't beat in lockstep — the same intent as the Vue
 * kit's `shimmerFromSeed` (rate/amplitude/baseline), expressed as CSS timing.
 * `prefers-reduced-motion: reduce` disables the animation entirely (handled
 * in the co-located CSS module).
 */
export interface DitherSkeletonProps {
  seed?: number;
  class?: string;
  children?: React.ReactNode;
}

export function DitherSkeleton({ seed, class: className }: DitherSkeletonProps) {
  // Map seed → (duration, delay) so each skeleton shimmers at its own cadence.
  // Mirrors shimmerFromSeed's rate variance; deterministic for a given seed.
  const { duration, delay } = useMemo(() => {
    if (seed === undefined) return { duration: "1.6s", delay: "0s" };
    const rand = xorshift32(Math.round(seed) ^ 0x3c6ef372);
    const dur = 1.2 + rand() * 1.6; // 1.2s..2.8s
    const del = rand() * 1.6; // 0s..1.6s phase offset
    return { duration: `${dur.toFixed(3)}s`, delay: `${del.toFixed(3)}s` };
  }, [seed]);

  return (
    <div
      aria-hidden="true"
      className={cn(styles.skeleton, className)}
      style={
        {
          "--dk-sk-dur": duration,
          "--dk-sk-delay": delay,
        } as React.CSSProperties
      }
    />
  );
}
