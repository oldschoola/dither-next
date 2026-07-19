"use client";

import { useState } from "react";

import {
  DitherCheckbox,
  DitherProgress,
  DitherSlider,
  DitherSwitch,
  type SliderVariant,
} from "@dither-kit";

import { DemoCard } from "../DemoCard";
import { PropsTable, type PropRow } from "../PropsTable";

/**
 * FormDocs — Switch / Checkbox / Slider / Progress section pack.
 * Port of `src/pages/docs/components/FormDocs.vue`.
 *
 * One React component rendering a fragment of sections, matching the Vue
 * `<template>` (which is itself a fragment). Section ids, classes, prose,
 * SNIPPET_* code strings, and the API table rows are ported verbatim from
 * the Vue source. The SNIPPET_* strings show React/TSX usage of the kit,
 * documenting the API the demo renders.
 *
 * State mapping (guide §4): `ref(true)` → `useState(true)`,
 * `reactive({...})` → one `useState` object updated via a setter that spreads
 * the previous value, `v-model` → `value` + `onChange`. The progress bar
 * below binds to the same `level` state as the slider above it (Vue contract).
 */
const SLIDER_VARIANTS = ["gradient", "dotted", "hatched", "solid"] as const;

const SNIPPET_SWITCH = `import { DitherSwitch } from "@dither-kit"
import { useState } from "react"

const [bloom, setBloom] = useState(true)

<label className="flex items-center justify-between gap-4">
  <span className="text-[13px]">Bloom on hover</span>
  <DitherSwitch value={bloom} onChange={setBloom} label="Bloom on hover" color="blue" />
</label>`;

const SNIPPET_CHECKBOX = `import { DitherCheckbox } from "@dither-kit"
import { useState } from "react"

const [opts, setOpts] = useState({ grid: true, snap: false, rulers: true })

<div className="grid gap-3">
  <DitherCheckbox value={opts.grid} onChange={v => setOpts(o => ({ ...o, grid: v }))}>Show grid</DitherCheckbox>
  <DitherCheckbox value={opts.snap} onChange={v => setOpts(o => ({ ...o, snap: v }))}>Snap to pixels</DitherCheckbox>
  <DitherCheckbox value={opts.rulers} onChange={v => setOpts(o => ({ ...o, rulers: v }))}>Show rulers</DitherCheckbox>
</div>`;

const SNIPPET_SLIDER = `import { useState } from "react"

const [level, setLevel] = useState(40)
const [range, setRange] = useState<[number, number]>([25, 75])

{/* single */}
<DitherSlider value={level} onChange={setLevel} label="Level" />

{/* range: an array value grows a second thumb */}
<DitherSlider value={range} onChange={setRange} label="Price" show-value />

{/* ticks mark the steps; variant picks the fill texture */}
<DitherSlider value={quality} onChange={setQuality} label="Quality" step={10} ticks
  variant="dotted" show-value />`;

const SNIPPET_PROGRESS = `import { DitherProgress } from "@dither-kit"
import { useState } from "react"

const [level, setLevel] = useState(40)

<div className="grid gap-6">
  <DitherProgress value={level} color="blue" />
  <DitherProgress indeterminate color="purple" />
</div>`;

const API: Record<string, PropRow[]> = {
  switch: [
    { prop: "modelValue", type: "boolean", default: "—" },
    { prop: "color", type: "PixelColor", default: '"blue"' },
    { prop: "disabled", type: "boolean", default: "false" },
    { prop: "className", type: "string", default: "—" },
  ],
  checkbox: [
    { prop: "modelValue", type: "boolean", default: "—" },
    { prop: "color", type: "PixelColor", default: '"blue"' },
    { prop: "disabled", type: "boolean", default: "false" },
    { prop: "className", type: "string", default: "—" },
  ],
  slider: [
    { prop: "modelValue", type: "number | [number, number] — array = range", default: "—" },
    { prop: "min / max / step", type: "number", default: "0 / 100 / 1" },
    { prop: "variant", type: '"gradient" | "dotted" | "hatched" | "solid"', default: '"gradient"' },
    { prop: "ticks", type: "boolean — tick columns at steps (≤25) or tenths", default: "false" },
    { prop: "show-value", type: "boolean — bubble while dragging or focused", default: "false" },
    { prop: "color", type: "PixelColor", default: '"blue"' },
    { prop: "disabled", type: "boolean", default: "false" },
  ],
  progress: [
    { prop: "value", type: "number", default: "0" },
    { prop: "color", type: "PixelColor", default: '"blue"' },
    { prop: "indeterminate", type: "boolean", default: "false" },
    { prop: "className", type: "string", default: "—" },
  ],
};

export function FormDocs() {
  const [bloom, setBloom] = useState(true);

  const [opts, setOpts] = useState({ grid: true, snap: false, rulers: true });

  const [level, setLevel] = useState(40);
  const [priceRange, setPriceRange] = useState<[number, number]>([25, 75]);
  const [quality, setQuality] = useState(60);
  const [variantLevels, setVariantLevels] = useState<Record<SliderVariant, number>>({
    gradient: 65,
    dotted: 65,
    hatched: 65,
    solid: 65,
  });

  return (
    <>
      <section id="switch" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Switch</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A toggle whose track is a dithered canvas — the accent gradient fills in
          when on, fades to a muted wash when off.
        </p>
        <DemoCard code={SNIPPET_SWITCH}>
          <div className="mx-auto max-w-sm">
            <label className="flex items-center justify-between gap-4">
              <span className="text-[13px]">Bloom on hover</span>
              <DitherSwitch value={bloom} onChange={setBloom} label="Bloom on hover" color="blue" />
            </label>
          </div>
        </DemoCard>
        <PropsTable rows={API.switch} />
      </section>

      <section id="checkbox" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Checkbox</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A pixel-border box that fills with the Bayer texture and draws a chunky
          near-white checkmark when checked. Label goes in the default slot.
        </p>
        <DemoCard code={SNIPPET_CHECKBOX}>
          <div className="mx-auto grid max-w-sm gap-3">
            <DitherCheckbox value={opts.grid} onChange={(v) => setOpts((prev) => ({ ...prev, grid: v }))}>
              Show grid
            </DitherCheckbox>
            <DitherCheckbox value={opts.snap} onChange={(v) => setOpts((prev) => ({ ...prev, snap: v }))}>
              Snap to pixels
            </DitherCheckbox>
            <DitherCheckbox value={opts.rulers} onChange={(v) => setOpts((prev) => ({ ...prev, rulers: v }))}>
              Show rulers
            </DitherCheckbox>
          </div>
        </DemoCard>
        <PropsTable rows={API.checkbox} />
      </section>

      <section id="slider" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Slider</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Drag or arrow-key the square thumb — the filled side of the track dithers
          denser toward the value, the rest stays a muted rail.
        </p>
        <DemoCard code={SNIPPET_SLIDER}>
          <div className="mx-auto grid max-w-sm gap-7">
            <div className="flex items-center gap-4">
              <DitherSlider value={level} onChange={(v) => setLevel(Array.isArray(v) ? v[1] : v)} label="Level" min={0} max={100} step={1} color="blue" />
              <span className="w-8 text-right text-[13px] tabular-nums">{level}</span>
            </div>
            <div className="grid gap-2">
              <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
                <span>Price range</span>
                <span className="tabular-nums">{priceRange[0]} – {priceRange[1]}</span>
              </div>
              <DitherSlider value={priceRange} onChange={(v) => setPriceRange(Array.isArray(v) ? v : [priceRange[0], priceRange[1]])} label="Price" color="green" showValue />
            </div>
            <div className="grid gap-2">
              <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
                <span>Quality · step 10 · ticks</span>
                <span className="tabular-nums">{quality}</span>
              </div>
              <DitherSlider value={quality} onChange={(v) => setQuality(Array.isArray(v) ? v[1] : v)} label="Quality" step={10} ticks showValue color="purple" />
            </div>
          </div>
        </DemoCard>
        <h3 className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">variants</h3>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {SLIDER_VARIANTS.map((v) => (
            <div key={v}>
              <DitherSlider
                value={variantLevels[v]}
                onChange={(next) => setVariantLevels((prev) => ({ ...prev, [v]: Array.isArray(next) ? next[1] : next }))}
                label={`${v} slider`}
                variant={v}
              />
              <div className="mt-2 text-center text-[10px] text-muted-foreground">{v}</div>
            </div>
          ))}
        </div>
        <PropsTable rows={API.slider} />
      </section>

      <section id="progress" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Progress</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A dithered fill that grows with <code className="text-foreground/80">value</code>;
          set <code className="text-foreground/80">indeterminate</code> to scroll a
          texture band instead (static under reduced motion). The bar below is bound
          to the slider above.
        </p>
        <DemoCard code={SNIPPET_PROGRESS}>
          <div className="mx-auto grid max-w-sm gap-6">
            <div className="grid gap-2">
              <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
                <span>Rendering</span>
                <span className="tabular-nums">{level}%</span>
              </div>
              {/* Bound to the same `level` state as the slider above (Vue contract). */}
              <DitherProgress value={level} color="blue" />
            </div>
            <div className="grid gap-2">
              <span className="text-[11px] text-muted-foreground">Indexing</span>
              <DitherProgress indeterminate color="purple" />
            </div>
          </div>
        </DemoCard>
        <PropsTable rows={API.progress} />
      </section>
    </>
  );
}
