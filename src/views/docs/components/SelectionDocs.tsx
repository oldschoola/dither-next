"use client";

import { useState } from "react";

import {
  DitherAutocomplete,
  DitherCheckboxGroup,
  DitherCombobox,
  DitherRadioGroup,
  DitherSelect,
  DitherToggle,
  DitherToggleGroup,
} from "@dither-kit";

import { DemoCard } from "../DemoCard";
import { PropsTable, type PropRow } from "../PropsTable";

/**
 * SelectionDocs — Select / Combobox / Autocomplete / Radio / Checkbox Group /
 * Toggle / Toggle Group section pack.
 * Port of `src/pages/docs/components/SelectionDocs.vue`.
 *
 * One React component rendering a fragment of sections, matching the Vue
 * `<template>` (which is itself a fragment). Section ids, classes, prose,
 * SNIPPET_* code strings, and the API table rows are ported verbatim from
 * the Vue source. The SNIPPET_* strings show React/TSX usage of the kit,
 * documenting the API the demo renders.
 *
 * State mapping (guide §4): `ref(x)` → `useState(x)`,
 * `v-model` → `value` + `onChange`. The Combobox passes `color={swatch}`
 * verbatim from the Vue (`:color="swatch"`), showing the picked swatch.
 */
const CHARTS = [
  { value: "area", label: "Area" },
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
  { value: "pie", label: "Pie" },
  { value: "radar", label: "Radar" },
];

const COLORS = ["green", "blue", "purple", "pink", "orange", "red", "grey"].map((c) => ({
  value: c,
  label: c,
}));

const TERMS = [
  "dither",
  "dithering",
  "dither kit",
  "bayer",
  "bayer 4x4",
  "bayer matrix",
  "pixel",
  "pixel art",
  "pixelated",
];

const BLOOMS = [
  { value: "off", label: "Off" },
  { value: "low", label: "Low" },
  { value: "high", label: "High" },
  { value: "aura", label: "Aura" },
];

const PARTS = [
  { value: "grid", label: "Grid" },
  { value: "axes", label: "Axes" },
  { value: "legend", label: "Legend" },
  { value: "tooltip", label: "Tooltip" },
];

const ALIGN = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const STYLES = [
  { value: "bold", label: "Bold" },
  { value: "italic", label: "Italic" },
  { value: "underline", label: "Underline" },
];

const SNIPPET_SELECT = `import { DitherSelect } from "@dither-kit"
import { useState } from "react"

const [chart, setChart] = useState("area")
const CHARTS = [
  { value: "area", label: "Area" },
  { value: "line", label: "Line" },
  { value: "bar", label: "Bar" },
  { value: "pie", label: "Pie" },
  { value: "radar", label: "Radar" },
]

<DitherSelect value={chart} onChange={setChart} options={CHARTS} placeholder="Chart type…" />
<p className="text-[11px] text-muted-foreground">chart: "{chart}"</p>`;

const SNIPPET_COMBOBOX = `import { DitherCombobox } from "@dither-kit"
import { useState } from "react"

const [swatch, setSwatch] = useState("blue")
const COLORS = ["green", "blue", "purple", "pink", "orange", "red", "grey"].map(
  (c) => ({ value: c, label: c })
)

<DitherCombobox value={swatch} onChange={setSwatch} options={COLORS} color={swatch} />
<p className="text-[11px] text-muted-foreground">swatch: "{swatch}"</p>`;

const SNIPPET_AUTOCOMPLETE = `import { DitherAutocomplete } from "@dither-kit"
import { useState } from "react"

const [term, setTerm] = useState("")
const TERMS = ["dither", "dithering", "bayer", "bayer 4x4", "pixel", "pixel art"]

<DitherAutocomplete value={term} onChange={setTerm} suggestions={TERMS} placeholder="Search the docs…" />
<p className="text-[11px] text-muted-foreground">term: "{term}"</p>`;

const SNIPPET_RADIO = `import { DitherRadioGroup } from "@dither-kit"
import { useState } from "react"

const [bloomLevel, setBloomLevel] = useState("low")
const BLOOMS = [
  { value: "off", label: "Off" },
  { value: "low", label: "Low" },
  { value: "high", label: "High" },
  { value: "aura", label: "Aura" },
]

<DitherRadioGroup value={bloomLevel} onChange={setBloomLevel} options={BLOOMS} label="Bloom level" />
<p className="text-[11px] text-muted-foreground">bloom: "{bloomLevel}"</p>`;

const SNIPPET_CHECKBOX_GROUP = `import { DitherCheckboxGroup } from "@dither-kit"
import { useState } from "react"

const [parts, setParts] = useState(["grid", "axes"])
const PARTS = [
  { value: "grid", label: "Grid" },
  { value: "axes", label: "Axes" },
  { value: "legend", label: "Legend" },
  { value: "tooltip", label: "Tooltip" },
]

<DitherCheckboxGroup value={parts} onChange={setParts} options={PARTS} label="Chart parts" />
<p className="text-[11px] text-muted-foreground">parts: [{parts.join(", ")}]</p>`;

const SNIPPET_TOGGLE = `import { DitherToggle } from "@dither-kit"
import { useState } from "react"

const [bloomOn, setBloomOn] = useState(true)

<DitherToggle value={bloomOn} onChange={setBloomOn}>bloom</DitherToggle>
<p className="text-[11px] text-muted-foreground">bloom: {bloomOn}</p>`;

const SNIPPET_TOGGLE_GROUP = `import { DitherToggleGroup } from "@dither-kit"
import { useState } from "react"

const [align, setAlign] = useState("left")
const ALIGN = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
]

const [styles, setStyles] = useState(["bold"])
const STYLES = [
  { value: "bold", label: "Bold" },
  { value: "italic", label: "Italic" },
  { value: "underline", label: "Underline" },
]

<DitherToggleGroup value={align} onChange={setAlign} options={ALIGN} />
<DitherToggleGroup value={styles} onChange={setStyles} options={STYLES} type="multiple" />`;

const API: Record<string, PropRow[]> = {
  select: [
    { prop: "options", type: "Option[]", default: "—" },
    { prop: "modelValue", type: "string", default: "—" },
    { prop: "placeholder", type: "string", default: '"Select…"' },
    { prop: "color", type: "PixelColor", default: '"blue"' },
    { prop: "disabled / invalid", type: "boolean", default: "false" },
    { prop: "className", type: "string", default: "—" },
  ],
  combobox: [
    { prop: "options", type: "Option[]", default: "—" },
    { prop: "modelValue", type: "string", default: "—" },
    { prop: "placeholder", type: "string", default: '"Select…"' },
    { prop: "color", type: "PixelColor", default: '"blue"' },
    { prop: "disabled", type: "boolean", default: "false" },
    { prop: "className", type: "string", default: "—" },
  ],
  autocomplete: [
    { prop: "suggestions", type: "string[]", default: "—" },
    { prop: "modelValue", type: "string", default: "—" },
    { prop: "placeholder", type: "string", default: '"Search…"' },
    { prop: "disabled", type: "boolean", default: "false" },
    { prop: "className", type: "string", default: "—" },
  ],
  radio: [
    { prop: "options", type: "Option[]", default: "—" },
    { prop: "modelValue", type: "string", default: "—" },
    { prop: "color", type: "PixelColor", default: '"blue"' },
    { prop: "label", type: "string", default: "—" },
    { prop: "className", type: "string", default: "—" },
  ],
  checkboxGroup: [
    { prop: "options", type: "Option[]", default: "—" },
    { prop: "modelValue", type: "string[]", default: "—" },
    { prop: "color", type: "PixelColor", default: '"blue"' },
    { prop: "label", type: "string", default: "—" },
    { prop: "className", type: "string", default: "—" },
  ],
  toggle: [
    { prop: "modelValue", type: "boolean", default: "—" },
    { prop: "color", type: "PixelColor", default: '"blue"' },
    { prop: "disabled", type: "boolean", default: "false" },
    { prop: "className", type: "string", default: "—" },
  ],
  toggleGroup: [
    { prop: "options", type: "Option[]", default: "—" },
    { prop: "modelValue", type: "string | string[]", default: "—" },
    { prop: "type", type: '"single" | "multiple"', default: '"single"' },
    { prop: "color", type: "PixelColor", default: '"blue"' },
    { prop: "className", type: "string", default: "—" },
  ],
};

export function SelectionDocs() {
  const [chart, setChart] = useState("area");
  const [swatch, setSwatch] = useState("blue");
  const [term, setTerm] = useState("");
  const [bloomLevel, setBloomLevel] = useState("low");
  const [parts, setParts] = useState<string[]>(["grid", "axes"]);
  const [bloomOn, setBloomOn] = useState(true);
  const [align, setAlign] = useState("left");
  const [styles, setStyles] = useState<string[]>(["bold"]);

  return (
    <>
      <section id="select" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Select</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A listbox behind an input-like trigger — Enter, Space or ArrowDown opens
          the panel, arrows move the highlight, and the picked row carries a small
          dithered swatch. Escape or an outside click closes it.
        </p>
        <DemoCard code={SNIPPET_SELECT}>
          <div className="mx-auto max-w-sm">
            <DitherSelect value={chart} options={CHARTS} placeholder="Chart type…" onChange={setChart} />
            <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
              chart: &quot;{chart}&quot;
            </p>
          </div>
        </DemoCard>
        <PropsTable rows={API.select} />
      </section>

      <section id="combobox" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Combobox</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A select whose trigger is an input — typing filters the options
          (case-insensitive), Enter picks the highlighted match, and blur snaps the
          text back to the last valid value.
        </p>
        <DemoCard code={SNIPPET_COMBOBOX}>
          <div className="mx-auto max-w-sm">
            <DitherCombobox value={swatch} options={COLORS} color={swatch} onChange={setSwatch} />
            <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
              swatch: &quot;{swatch}&quot;
            </p>
          </div>
        </DemoCard>
        <PropsTable rows={API.combobox} />
      </section>

      <section id="autocomplete" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Autocomplete</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A free-text input with suggestions — anything you type is the value;
          picking a row just fills the input. Try{" "}
          <code className="text-foreground/80">dither</code>,{" "}
          <code className="text-foreground/80">bayer</code> or{" "}
          <code className="text-foreground/80">pixel</code>.
        </p>
        <DemoCard code={SNIPPET_AUTOCOMPLETE}>
          <div className="mx-auto max-w-sm">
            <DitherAutocomplete value={term} suggestions={TERMS} placeholder="Search the docs…" onChange={setTerm} />
            <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
              term: &quot;{term}&quot;
            </p>
          </div>
        </DemoCard>
        <PropsTable rows={API.autocomplete} />
      </section>

      <section id="radio" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Radio</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A radiogroup of pixel circles — unchecked rings are a 1px pixel border,
          the checked one fills its inner dot with the Bayer texture. Arrow keys
          move and select (roving tabindex).
        </p>
        <DemoCard code={SNIPPET_RADIO}>
          <div className="mx-auto max-w-sm">
            <DitherRadioGroup value={bloomLevel} options={BLOOMS} label="Bloom level" onChange={setBloomLevel} />
            <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
              bloom: &quot;{bloomLevel}&quot;
            </p>
          </div>
        </DemoCard>
        <PropsTable rows={API.radio} />
      </section>

      <section id="checkbox-group" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Checkbox Group</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A labelled group of DitherCheckboxes bound to one string array — toggling
          a box adds or removes its option&apos;s value.
        </p>
        <DemoCard code={SNIPPET_CHECKBOX_GROUP}>
          <div className="mx-auto max-w-sm">
            <DitherCheckboxGroup value={parts} options={PARTS} label="Chart parts" onChange={setParts} />
            <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
              parts: [{parts.join(", ")}]
            </p>
          </div>
        </DemoCard>
        <PropsTable rows={API.checkboxGroup} />
      </section>

      <section id="toggle" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Toggle</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A pressed-state button — off is a quiet border, on fills behind the label
          with the badge&apos;s dithered gradient. Label goes in the default slot.
        </p>
        <DemoCard code={SNIPPET_TOGGLE}>
          <div className="mx-auto max-w-sm text-center">
            <DitherToggle value={bloomOn} onChange={setBloomOn}>bloom</DitherToggle>
            <p className="mt-4 font-mono text-[11px] text-muted-foreground">
              bloom: {bloomOn ? "true" : "false"}
            </p>
          </div>
        </DemoCard>
        <PropsTable rows={API.toggle} />
      </section>

      <section id="toggle-group" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Toggle Group</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A bordered row of toggles — <code className="text-foreground/80">single</code>{" "}
          behaves like a radio group (one value, arrows move), while{" "}
          <code className="text-foreground/80">multiple</code> keeps each button
          independently pressed against a string array.
        </p>
        <DemoCard code={SNIPPET_TOGGLE_GROUP}>
          <div className="mx-auto grid max-w-sm justify-items-center gap-4">
            <DitherToggleGroup value={align} options={ALIGN} onChange={(v) => setAlign(typeof v === "string" ? v : align)} />
            <DitherToggleGroup value={styles} options={STYLES} type="multiple" onChange={(v) => setStyles(Array.isArray(v) ? v : styles)} />
            <p className="font-mono text-[11px] text-muted-foreground">
              align: &quot;{align}&quot; · styles: [{styles.join(", ")}]
            </p>
          </div>
        </DemoCard>
        <PropsTable rows={API.toggleGroup} />
      </section>
    </>
  );
}
