"use client";

import { useMemo, useState } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  cssColor,
  DitherAvatar,
  DitherButton,
  DitherGradient,
  DitherImage,
  Dot,
  Grid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  Sparkline,
  Tooltip,
  XAxis,
  YAxis,
  type AreaVariant,
  type ButtonVariant,
  type DitherColor,
  type DotVariant,
  type GradientDirection,
  type PixelBloom,
} from "@dither-kit";

import { routePath, assetPath } from "@/shared/lib";
import { DemoCard } from "../DemoCard";
import { PropsTable, type PropRow } from "../PropsTable";
import {
  COLORS,
  DOT_VARIANTS,
  SEEDS,
  STATS,
  VARIANTS,
  wave,
  BUTTON_COLORS,
  DIRECTIONS,
  config,
  miniConfig,
  miniPieConfig,
  miniPieRows,
  miniRows,
  pieConfig,
  pieRows,
  radarConfig,
  radarRows,
  rows,
  trafficConfig,
  trafficRows,
} from "../docs-data";

/**
 * ChartsDocs — Area / Line / Bar / Pie / Radar / Sparkline / Button / Avatar /
 * Gradient / Image / Palette section pack.
 *
 * Port of `src/pages/docs/DocsPage.vue` lines 1233–1598 (the `components-charts`
 * pack). The Vue `<script setup>` reactive state becomes React `useState`;
 * the computed code snippets become `useMemo`. SNIPPETS strings preserve Vue
 * `<template>` syntax on purpose — the code tab documents the Vue API the live
 * React demo renders, mirroring the other section packs (guide §4).
 *
 * State mapping:
 *  - `reactive({ area, bar, pie, dot })` → one `picked` state object.
 *  - `reactive({ area, bar, pie, line })` replay counters → one `galleryReplay`
 *    state object; `pick()` bumps the matching counter so the kit's own dither
 *    entrance IS the transition (no CSS theatre).
 *  - `ref(...)` scalars → individual `useState`.
 *
 * The Vue RadarChart omits `data-key` (the Vue kit defaults it to `""`). The
 * React `PolarChartProps` makes `dataKey` required, so we pass `dataKey=""` —
 * the radar canvas ignores the root value column (only pie reads it).
 */

const BLOOMS: PixelBloom[] = ["off", "low", "high", "aura"];
const AVATAR_NAMES = ["ada", "linus", "grace", "alan", "edsger", "barbara"];

const thumbClass = (active: boolean) =>
  `rounded-md p-2 text-left transition-colors ${active ? "bg-card" : "hover:bg-card/50"}`;
const thumbLabel = (active: boolean) =>
  `mt-2 text-center text-[10px] transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`;
const chipClass = (active: boolean) =>
  `rounded px-2.5 py-1 text-[11px] transition-colors ${active ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`;

const SNIPPETS = {
  install: `# 1 — copy the kit folder straight from the repo (degit grabs just the folder)
npx degit drvova/dither-ui/dither-kit src/dither-kit

# 2 — install the four runtime deps (Vue & Tailwind you already have)
npm i d3-scale d3-shape clsx tailwind-merge

# 3 — alias @dither-kit so imports stay clean
#     vite.config.ts → resolve.alias: { "@dither-kit": "/src/dither-kit" }
#     tsconfig.json  → paths:        { "@dither-kit": ["./src/dither-kit"] }

# 4 — use it
import { AreaChart, Area, DitherButton } from "@dither-kit"`,
  seeds: `<!-- one integer is a complete visual personality: -->
<AreaChart :data="rows" :config="config" :seed="1984">
  <Area data-key="revenue" :variant="1984" />   <!-- texture  -->
</AreaChart>
<!-- :seed derives duration · delay · easing · stagger · sparkles · bloom
     for every prop you leave unset; explicit props always win.
     Seeds also work per prop: bloom / easing / variant / color(hue). -->
<DitherButton :bloom="1984">Glow</DitherButton>`,
  styling: `/* the kit reads shadcn-style tokens — theme by overriding them */
:root {
  --background: #08090b;   /* chart chrome: axes, legend, tooltip */
  --foreground: #ededed;
  --border: #22252b;
  --accent: #3f8ff3;
}

<!-- every component forwards class — compose with your utilities -->
<AreaChart class="rounded-lg border border-border/60 p-2" … />`,
  composition: `<AreaChart :data="rows" :config="config">  <!-- root: scales + context -->
  <Grid horizontal />                       <!-- chrome registers first -->
  <XAxis data-key="month" />
  <YAxis :tick-count="4" />
  <Area data-key="revenue" variant="gradient">
    <Dot variant="border" :r="2" />         <!-- series children nest -->
  </Area>
  <Legend align="right" />                  <!-- reads the same context -->
  <Tooltip label-key="month" />
</AreaChart>`,
  accessibility: `<!-- one accessible node per chart, not 400 rects -->
<svg role="img" aria-label="Chart">…</svg>   <!-- provided by the root -->
<canvas aria-hidden="true" />                <!-- pixels stay silent -->

/* honored automatically — no opt-in props */
@media (prefers-reduced-motion: reduce)      { /* entrances snap  */ }
@media (prefers-reduced-transparency: reduce) { /* chrome goes solid */ }`,
  dashboard: `<!-- stat cards -->
<div v-for="s in stats" class="rounded-lg border p-4">
  <span>{{ s.label }}</span> <b>{{ s.value }}</b>
  <Sparkline :data="s.trend" :color="s.color" class="h-8" />
</div>

<!-- main panel -->
<AreaChart :data="rows" :config="config" stack-type="stacked">
  <XAxis data-key="month" /> <Area data-key="expenses" variant="dotted" />
  <Area data-key="revenue" /> <Tooltip label-key="month" />
</AreaChart>
<PieChart :data="share" :config="shareConfig" data-key="value"
  name-key="name" :inner-radius="0.55"><Pie /></PieChart>`,
  shell: `<div class="grid grid-cols-[160px_1fr] rounded-lg border">
  <aside class="border-r p-3">          <!-- sidebar -->
    brand · nav (active chip) · <DitherAvatar /> footer
  </aside>
  <div>
    <header class="border-b px-4">      <!-- topbar -->
      title · <DitherButton>Export</DitherButton>
    </header>
    <main class="grid gap-4 p-4">
      stat cards with <Sparkline />
      <AreaChart … />                    <!-- main panel -->
    </main>
  </div>
</div>`,
  monitoring: `<LineChart :data="rows" :config="config">  <!-- pulse -->
  <Grid horizontal /> <XAxis data-key="month" />
  <Line data-key="revenue" /> <Line data-key="expenses" />
</LineChart>

<RadarChart … />                        <!-- sprint health -->

<div v-for="s in services">             <!-- status rows -->
  <span :class="s.ok ? 'bg-green' : 'bg-red'" />  <!-- dot -->
  {{ s.name }} <Sparkline :data="s.data" :color="s.color" />
  {{ s.uptime }}
</div>`,
  team: `<div v-for="m in team" class="flex items-center gap-4">
  <DitherAvatar :name="m.name" :size="32" />
  {{ m.name }} · {{ m.role }}
  <Sparkline :data="m.data" :color="m.color" class="h-5 flex-1" />
  <span class="tabular-nums">{{ m.commits }}</span>
</div>`,
  usage: `<BarChart :data="usageRows" :config="usageConfig">   <!-- renders/mo -->
  <XAxis data-key="month" /> <Bar data-key="renders" />
</BarChart>

<PieChart :data="quotaRows" :config="quotaConfig"    <!-- quota donut -->
  data-key="value" name-key="name" :inner-radius="0.62">
  <Pie /> <Legend align="center" />
</PieChart>

<DitherButton color="blue">Upgrade to Pro</DitherButton>`,
  signin: `<div class="relative overflow-hidden rounded-lg border p-8">
  <DitherGradient from="blue" direction="up" :opacity="0.2" />
  <span>dither-ui</span>                    <!-- wordmark -->
  <input placeholder="you@dither-ui.com" />
  <input type="password" placeholder="••••••••" />
  <DitherButton color="blue" class="w-full">Sign in</DitherButton>
</div>`,
  area: `const rows = [{ month: "Jan", revenue: 42, expenses: 31 }, …]
const config = {
  revenue:  { label: "Revenue",  color: "blue" },
  expenses: { label: "Expenses", color: "purple" },
}

<AreaChart :data="rows" :config="config" stack-type="stacked">
  <Grid horizontal />
  <XAxis data-key="month" :max-ticks="6" />
  <YAxis :tick-count="4" />
  <Area data-key="expenses" variant="dotted" />
  <Area data-key="revenue" variant="gradient" />
  <Legend align="right" />
  <Tooltip label-key="month" />
</AreaChart>`,
  line: `<LineChart :data="rows" :config="config">
  <Grid horizontal />
  <XAxis data-key="month" :max-ticks="6" />
  <Line data-key="revenue">
    <Dot variant="border" :r="2" />
  </Line>
  <Line data-key="expenses" />
  <Legend align="right" />
  <Tooltip label-key="month" />
</LineChart>`,
  bar: `<BarChart :data="trafficRows" :config="trafficConfig">
  <Grid horizontal />
  <XAxis data-key="month" />
  <YAxis :tick-count="4" />
  <Bar data-key="organic" />
  <Bar data-key="paid" />
  <Legend align="right" />
  <Tooltip label-key="month" />
</BarChart>`,
  pie: `<PieChart :data="pieRows" :config="pieConfig"
  data-key="value" name-key="name" :inner-radius="0.55">
  <Pie variant="gradient" is-clickable />
  <Legend align="center" />
</PieChart>`,
  radar: `<RadarChart :data="radarRows" :config="radarConfig" name-key="axis">
  <Radar data-key="current" />
  <Radar data-key="previous" />
  <Legend align="center" />
</RadarChart>`,
  sparkline: `<div class="rounded-lg border p-4">
  <div class="text-xs text-muted-foreground">Revenue</div>
  <div class="flex items-baseline gap-2">
    <span class="text-lg tabular-nums">$48.2k</span>
    <span class="text-xs text-green-400">+12.4%</span>
  </div>
  <Sparkline :data="last24h" color="green" class="mt-3 h-8 w-full" />
</div>`,
  motion: `const replayToken = ref(0)

<BarChart :data="rows" :config="config"
  :animation-duration="900" :replay-token="replayToken">
  <Bar data-key="revenue" />
</BarChart>

<DitherButton @click="replayToken++">Replay</DitherButton>
<!-- prefers-reduced-motion is respected automatically:
     entrances snap, sparkles hold still -->`,
  button: `<!-- variants -->
<DitherButton variant="gradient">Deploy</DitherButton>
<DitherButton variant="solid">Run</DitherButton>
<DitherButton variant="dotted">Preview</DitherButton>
<DitherButton variant="hatched">Cancel</DitherButton>

<!-- colors, bloom, static raster -->
<DitherButton color="green" bloom="low">Approve</DitherButton>
<DitherButton color="red" disabled>Delete</DitherButton>
<DitherButton render-mode="static" precompiled="/button.png">Saved</DitherButton>`,
  avatar: `<DitherAvatar name="ada" :size="24" />
<DitherAvatar name="ada" :size="32" />
<DitherAvatar name="ada" :size="48" />
<DitherAvatar name="grace" :size="48" bloom="low" />`,
  gradient: `<div class="relative h-40">
  <DitherGradient from="blue" to="transparent" direction="up" />
</div>
<div class="relative h-24">
  <DitherGradient render-mode="static" precompiled="/gradient.png" />
</div>
<!-- from/to: any DitherColor · direction: up · down · left · right
     cell: px per dither cell · opacity: 0…1
     max-cols / max-rows: backing-resolution caps (default 960×600 live, 320×200 static) -->`,
  image: `<DitherImage src="/sprites.webp" :cell="3" :focus-y="0.62" :fade="72"
  alt="The dither-ui sprite sheet, re-dithered" class="h-64 w-full" />
<DitherImage precompiled="/sprites-dither.png" alt="The dither-ui sprite sheet" />
<!-- cell: px per dither cell · fade: dithered edge dissolve
     focus-y: cover-crop focus (0 top … 1 bottom) -->`,
  palette: `import { cssColor, type DitherColor } from "@dither-kit"
cssColor("blue") // rgb(53,143,243)`,
};

const API: Record<string, PropRow[]> = {
  cartesian: [
    { prop: "data", type: "Row[]", default: "required" },
    { prop: "config", type: "ChartConfig", default: "required" },
    { prop: "stack-type", type: '"default" | "stacked" | "percent"', default: '"default"' },
    { prop: "margins", type: "Partial<Margins>", default: "{}" },
    { prop: "class", type: "string", default: "undefined" },
    { prop: "interactive", type: "boolean", default: "true" },
    { prop: "animate", type: "boolean", default: "true" },
    { prop: "seed", type: "number", default: "undefined" },
    { prop: "effect", type: "number", default: "seed / sparkle" },
    { prop: "animation-duration", type: "number (ms)", default: "seed / 900" },
    { prop: "animation-delay", type: "number (ms)", default: "seed / 0" },
    { prop: "easing", type: "name | bezier tuple | number", default: "seed / chart default" },
    { prop: "sparkles", type: "boolean", default: "true" },
    { prop: "hover-lift", type: "boolean", default: "true" },
    { prop: "stagger", type: "number", default: "seed / 0.55" },
    { prop: "cell", type: "number (px)", default: "2" },
    { prop: "sparkle-density", type: "number", default: "seed / 1" },
    { prop: "sparkle-speed", type: "number", default: "seed / 1" },
    { prop: "bar-gap", type: "number", default: "seed / 0.28" },
    { prop: "bar-edge", type: "number", default: "seed / 0.18" },
    { prop: "glow-size", type: "number", default: "seed / 0.16" },
    { prop: "hover-strength", type: "number", default: "seed / 1" },
    { prop: "dim-opacity", type: "number", default: "seed / 0.3" },
    { prop: "crosshair", type: "boolean", default: "true" },
    { prop: "replay-token", type: "number", default: "0" },
    { prop: "marker-index", type: "number | null", default: "null" },
    { prop: "hovered", type: "boolean", default: "false" },
    { prop: "bloom", type: '"off" | "low" | "high" | "aura" | object | number', default: "seed / off" },
    { prop: "bloom-on-hover", type: "boolean", default: "false" },
    { prop: "precompiled", type: "string | { src: string; width?: number; height?: number } — packaged plot URL", default: "undefined" },
    { prop: "default-selected-data-key", type: "string | null", default: "null" },
    { prop: "on-hover-change", type: "(index: number | null) => void", default: "undefined" },
    { prop: "on-selection-change", type: "(key: string | null) => void", default: "undefined" },
    { prop: "variant (series)", type: "name | TextureConfig | number (seed)", default: '"gradient"' },
  ],
  pie: [
    { prop: "data", type: "Row[]", default: "required" },
    { prop: "config", type: "ChartConfig", default: "required" },
    { prop: "data-key", type: "string", default: '""' },
    { prop: "name-key", type: "string", default: "required" },
    { prop: "inner-radius", type: "number 0…0.85", default: "seed / 0" },
    { prop: "margins", type: "Partial<Margins>", default: "{}" },
    { prop: "class", type: "string", default: "undefined" },
    { prop: "animate", type: "boolean", default: "true" },
    { prop: "seed", type: "number", default: "undefined" },
    { prop: "animation-duration", type: "number (ms)", default: "seed / 900" },
    { prop: "animation-delay", type: "number (ms)", default: "seed / 0" },
    { prop: "easing", type: "name | bezier tuple | number", default: "seed / ease-in-out" },
    { prop: "hover-lift", type: "boolean", default: "true" },
    { prop: "cell", type: "number (px)", default: "2" },
    { prop: "pop-out", type: "number", default: "seed / 6" },
    { prop: "rim-width", type: "number", default: "seed / 1.4" },
    { prop: "falloff", type: "number", default: "seed / 0.45" },
    { prop: "hover-strength", type: "number", default: "seed / 1" },
    { prop: "dim-opacity", type: "number", default: "seed / 0.3" },
    { prop: "start-angle", type: "number", default: "seed / 0" },
    { prop: "replay-token", type: "number", default: "0" },
    { prop: "bloom", type: '"off" | "low" | "high" | "aura" | object | number', default: "seed / off" },
    { prop: "bloom-on-hover", type: "boolean", default: "false" },
    { prop: "precompiled", type: "string | { src: string; width?: number; height?: number } — packaged plot URL", default: "undefined" },
    { prop: "default-selected-data-key", type: "string | null", default: "null" },
    { prop: "on-selection-change", type: "(key: string | null) => void", default: "undefined" },
  ],
  radar: [
    { prop: "data", type: "Row[]", default: "required" },
    { prop: "config", type: "ChartConfig", default: "required" },
    { prop: "name-key", type: "string", default: "required" },
    { prop: "rings", type: "number", default: "seed / 4" },
    { prop: "margins", type: "Partial<Margins>", default: "{}" },
    { prop: "class", type: "string", default: "undefined" },
    { prop: "animate", type: "boolean", default: "true" },
    { prop: "seed", type: "number", default: "undefined" },
    { prop: "animation-duration", type: "number (ms)", default: "seed / 900" },
    { prop: "animation-delay", type: "number (ms)", default: "seed / 0" },
    { prop: "easing", type: "name | bezier tuple | number", default: "seed / ease-in-out" },
    { prop: "hover-lift", type: "boolean", default: "true" },
    { prop: "cell", type: "number (px)", default: "2" },
    { prop: "falloff", type: "number", default: "seed / 0.45" },
    { prop: "hover-strength", type: "number", default: "seed / 1" },
    { prop: "dim-opacity", type: "number", default: "seed / 0.3" },
    { prop: "start-angle", type: "number", default: "seed / 0" },
    { prop: "replay-token", type: "number", default: "0" },
    { prop: "bloom", type: '"off" | "low" | "high" | "aura" | object | number', default: "seed / off" },
    { prop: "bloom-on-hover", type: "boolean", default: "false" },
    { prop: "precompiled", type: "string | { src: string; width?: number; height?: number } — packaged plot URL", default: "undefined" },
    { prop: "default-selected-data-key", type: "string | null", default: "null" },
    { prop: "on-selection-change", type: "(key: string | null) => void", default: "undefined" },
  ],
  sparkline: [
    { prop: "data", type: "number[]", default: "—" },
    { prop: "color", type: "DitherColor", default: "—" },
    { prop: "variant", type: '"gradient" | "dotted" | "hatched" | "solid"', default: '"gradient"' },
    { prop: "marker-index", type: "number | null", default: "null" },
    { prop: "bloom", type: '"off" | "low" | "high" | "aura"', default: '"off"' },
    { prop: "animate", type: "boolean", default: "false" },
  ],
  motion: [
    { prop: "animate", type: "boolean", default: "true" },
    { prop: "animation-duration", type: "number (ms)", default: "900" },
    { prop: "animation-delay", type: "number (ms)", default: "0" },
    { prop: "replay-token", type: "number — bump to re-run", default: "0" },
    { prop: "effect", type: "number — dedicated edge-motion seed", default: "master seed / gentle" },
  ],
  button: [
    { prop: "color", type: "PixelColor", default: "seed / blue" },
    { prop: "variant", type: '"gradient" | "dotted" | "hatched" | "solid"', default: "seed / gradient" },
    { prop: "bloom", type: '"off" | "low" | "high" | "aura" | object | number', default: "seed / off" },
    { prop: "cell", type: "number (px)", default: "seed / 2" },
    { prop: "seed", type: "number", default: "undefined" },
    { prop: "type", type: '"button" | "submit" | "reset"', default: '"button"' },
    { prop: "loading / disabled", type: "boolean", default: "false" },
    { prop: "class", type: "string", default: "undefined" },
    { prop: "render-mode", type: '"live" | "static"', default: '"live"' },
    { prop: "precompiled", type: "string | { src: string; width?: number; height?: number }", default: "undefined" },
    { prop: "max-cols / max-rows", type: "number", default: "960 / 600 (live) · 320 / 200 (static)" },
  ],
  avatar: [
    { prop: "name", type: "string", default: "—" },
    { prop: "size", type: "number (px)", default: "—" },
    { prop: "hue", type: "number 0…360", default: "from name" },
    { prop: "mirror", type: '"auto" | "on" | "off"', default: '"auto"' },
    { prop: "animate", type: "boolean", default: "true" },
    { prop: "bloom", type: '"off" | "low" | "high" | "aura"', default: '"off"' },
  ],
  gradient: [
    { prop: "from", type: "PixelColor", default: "seed / blue" },
    { prop: "to", type: 'PixelColor | "transparent"', default: '"transparent"' },
    { prop: "direction", type: '"up" | "down" | "left" | "right"', default: "seed / up" },
    { prop: "cell", type: "number (px)", default: "seed / 3" },
    { prop: "opacity", type: "number 0…1", default: "seed / 1" },
    { prop: "bloom", type: '"off" | "low" | "high" | "aura" | object | number', default: "seed / off" },
    { prop: "seed", type: "number", default: "undefined" },
    { prop: "class", type: "string", default: "undefined" },
    { prop: "render-mode", type: '"live" | "static"', default: '"live"' },
    { prop: "precompiled", type: "string | { src: string; width?: number; height?: number }", default: "undefined" },
    { prop: "max-cols / max-rows", type: "number", default: "960 / 600 (live) · 320 / 200 (static)" },
  ],
  image: [
    { prop: "src", type: "string", default: "required" },
    { prop: "cell", type: "number (px)", default: "seed / 3" },
    { prop: "focus-y", type: "number 0…1", default: "seed / 0.5" },
    { prop: "fade", type: "number (px)", default: "seed / 0" },
    { prop: "seed", type: "number", default: "undefined" },
    { prop: "alt", type: "string", default: '""' },
    { prop: "class", type: "string", default: "undefined" },
    { prop: "render-mode", type: '"live" | "static"', default: '"live"' },
    { prop: "precompiled", type: "string | { src: string; width?: number; height?: number }", default: "undefined" },
    { prop: "max-cols / max-rows", type: "number", default: "960 / 600 (live) · 320 / 200 (static)" },
  ],
  palette: [
    { prop: "cssColor(c)", type: "(DitherColor | number) → css string", default: "—" },
    { prop: "seedFromColor(c)", type: "(DitherColor | number) → Seed", default: "—" },
    { prop: "seedFromHue(h)", type: "(number 0…360) → Seed", default: "—" },
    { prop: "DitherColor", type: '"green" … "grey" — seven seeds', default: "—" },
  ],
};

export function ChartsDocs() {
  // Variant galleries drive the main preview: picking one swaps the prop and
  // bumps the chart's replay token, so the kit's own dither entrance IS the
  // transition — no CSS theatre required.
  const [picked, setPicked] = useState<{
    area: AreaVariant | number;
    bar: AreaVariant;
    pie: AreaVariant;
    dot: DotVariant;
  }>({
    area: "gradient",
    bar: "gradient",
    pie: "gradient",
    dot: "border",
  });
  const [galleryReplay, setGalleryReplay] = useState<{ area: number; bar: number; pie: number; line: number }>({
    area: 0,
    bar: 0,
    pie: 0,
    line: 0,
  });

  const pick = (section: "area" | "bar" | "pie", v: AreaVariant | number) => {
    setPicked((prev) => ({ ...prev, [section]: v }));
    setGalleryReplay((prev) => ({ ...prev, [section]: prev[section] + 1 }));
  };
  const randomSeed = () => pick("area", Math.floor(Math.random() * 1_000_000));
  const pickDot = (v: DotVariant) => {
    setPicked((prev) => ({ ...prev, dot: v }));
    setGalleryReplay((prev) => ({ ...prev, line: prev.line + 1 }));
  };

  // Button playground — one preview, three pickers.
  const [btn, setBtn] = useState<{
    variant: ButtonVariant;
    color: DitherColor;
    bloom: PixelBloom;
  }>({ variant: "gradient", color: "blue", bloom: "off" });

  // Avatar playground — picking a name replays the pixel entrance at all sizes.
  const [avatarName, setAvatarName] = useState("ada");
  const [avatarReplay, setAvatarReplay] = useState(0);
  const pickAvatar = (n: string) => {
    setAvatarName(n);
    setAvatarReplay((r) => r + 1);
  };

  // Gradient playground.
  const [grad, setGrad] = useState<{ direction: GradientDirection; from: DitherColor }>({
    direction: "up",
    from: "blue",
  });

  // Code tabs mirror the picked variant — what you see is what you copy.
  const areaCode = useMemo(
    () =>
      SNIPPETS.area.replace(
        'data-key="revenue" variant="gradient"',
        typeof picked.area === "number"
          ? `data-key="revenue" :variant="${picked.area}"  <!-- a seed — deterministic -->`
          : `data-key="revenue" variant="${picked.area}"`,
      ),
    [picked.area],
  );
  const lineCode = useMemo(
    () => SNIPPETS.line.replace('variant="border"', `variant="${picked.dot}"`),
    [picked.dot],
  );
  const barCode = useMemo(
    () =>
      SNIPPETS.bar
        .replace("<Bar data-key=\"organic\" />", `<Bar data-key="organic" variant="${picked.bar}" />`)
        .replace("<Bar data-key=\"paid\" />", `<Bar data-key="paid" variant="${picked.bar}" />`),
    [picked.bar],
  );
  const pieCode = useMemo(
    () => SNIPPETS.pie.replace('variant="gradient"', `variant="${picked.pie}"`),
    [picked.pie],
  );
  const buttonCode = useMemo(
    () =>
      `<DitherButton color="${btn.color}" variant="${btn.variant}"${btn.bloom === "off" ? "" : ` bloom="${btn.bloom}"`}>
  Deploy
</DitherButton>
<DitherButton render-mode="static" precompiled="/button.png">Saved</DitherButton>`,
    [btn.color, btn.variant, btn.bloom],
  );
  const avatarCode = useMemo(
    () => `<DitherAvatar name="${avatarName}" :size="48" />
<!-- same name, same face — at any size -->`,
    [avatarName],
  );
  const gradientCode = useMemo(
    () => `<div class="relative h-40">
  <DitherGradient from="${grad.from}" to="transparent" direction="${grad.direction}" />
</div>
<div class="relative h-24">
  <DitherGradient render-mode="static" precompiled="/gradient.png" />
</div>`,
    [grad.from, grad.direction],
  );

  return (
    <>
      {/* Area */}
      <section id="area" className="mt-16 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg tracking-tight">Area Chart</h2>
          <a
            href={`${routePath("/studio")}#new/area`}
            className="-m-2 shrink-0 p-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Open a new area chart in the studio"
          >
            open in studio →
          </a>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Revenue against expenses, stacked. Hover for the tooltip; click a legend
          entry to isolate a series.
        </p>
        <DemoCard code={areaCode}>
          <div className="h-64">
            <AreaChart data={rows} config={config} stackType="stacked" replayToken={galleryReplay.area}>
              <Grid horizontal />
              <XAxis dataKey="month" maxTicks={6} />
              <YAxis tickCount={4} />
              <Area dataKey="expenses" variant="dotted" />
              <Area dataKey="revenue" variant={picked.area} />
              <Legend align="right" isClickable />
              <Tooltip labelKey="month" />
            </AreaChart>
          </div>
        </DemoCard>
        <h3 className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">variants</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={picked.area === v}
              className={thumbClass(picked.area === v)}
              onClick={() => pick("area", v)}
            >
              <Sparkline data={wave} color="blue" variant={v} class="pointer-events-none h-14 w-full" />
              <div className={thumbLabel(picked.area === v)}>{v}</div>
            </button>
          ))}
        </div>
        <h3 className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">seed-generative</h3>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          A number is a seed: the same deterministic idea as the avatar,
          applied to texture. <code className="text-foreground/80">:variant=&quot;1984&quot;</code>
          renders the same fill on every chart, forever.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={picked.area === s}
              className={thumbClass(picked.area === s)}
              onClick={() => pick("area", s)}
            >
              <Sparkline data={wave} color="blue" variant={s} class="pointer-events-none h-14 w-full" />
              <div className={`${thumbLabel(picked.area === s)} tabular-nums`}>{s}</div>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={typeof picked.area === "number" && !SEEDS.includes(picked.area)}
            className={`${thumbClass(typeof picked.area === "number" && !SEEDS.includes(picked.area))} grid content-center`}
            onClick={randomSeed}
          >
            <div className="text-center text-[13px] text-muted-foreground" aria-hidden="true">~</div>
            <div className={`${thumbLabel(typeof picked.area === "number" && !SEEDS.includes(picked.area))} tabular-nums`}>
              {typeof picked.area === "number" && !SEEDS.includes(picked.area) ? picked.area : "random"}
            </div>
          </button>
        </div>
        <PropsTable rows={API.cartesian} />
      </section>

      {/* Line */}
      <section id="line" className="mt-16 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg tracking-tight">Line Chart</h2>
          <a
            href={`${routePath("/studio")}#new/line`}
            className="-m-2 shrink-0 p-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Open a new line chart in the studio"
          >
            open in studio →
          </a>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Bright series lines with sparkles on the live edge; nest a
          <code className="text-foreground/80">Dot</code> inside a line for markers.
        </p>
        <DemoCard code={lineCode}>
          <div className="h-64">
            <LineChart data={rows} config={config} replayToken={galleryReplay.line}>
              <Grid horizontal />
              <XAxis dataKey="month" maxTicks={6} />
              <Line dataKey="revenue">
                <Dot variant={picked.dot} r={2} />
              </Line>
              <Line dataKey="expenses" />
              <Legend align="right" />
              <Tooltip labelKey="month" />
            </LineChart>
          </div>
        </DemoCard>
        <h3 className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">dot variants</h3>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DOT_VARIANTS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={picked.dot === d}
              className={thumbClass(picked.dot === d)}
              onClick={() => pickDot(d)}
            >
              <div className="pointer-events-none h-20">
                <LineChart
                  data={miniRows}
                  config={miniConfig}
                  interactive={false}
                  margins={{ top: 6, right: 6, bottom: 6, left: 6 }}
                >
                  <Line dataKey="v">
                    <Dot variant={d} r={2.5} />
                  </Line>
                </LineChart>
              </div>
              <div className={thumbLabel(picked.dot === d)}>{d}</div>
            </button>
          ))}
        </div>
        <PropsTable rows={API.cartesian} />
      </section>

      {/* Bar */}
      <section id="bar" className="mt-16 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg tracking-tight">Bar Chart</h2>
          <a
            href={`${routePath("/studio")}#new/bar`}
            className="-m-2 shrink-0 p-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Open a new bar chart in the studio"
          >
            open in studio →
          </a>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Organic vs paid traffic, grouped. Set
          <code className="text-foreground/80">stack-type</code> to stacked or percent
          to pile the columns.
        </p>
        <DemoCard code={barCode}>
          <div className="h-64">
            <BarChart data={trafficRows} config={trafficConfig} replayToken={galleryReplay.bar}>
              <Grid horizontal />
              <XAxis dataKey="month" />
              <YAxis tickCount={4} />
              <Bar dataKey="organic" variant={picked.bar} />
              <Bar dataKey="paid" variant={picked.bar} />
              <Legend align="right" />
              <Tooltip labelKey="month" />
            </BarChart>
          </div>
        </DemoCard>
        <h3 className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">variants</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={picked.bar === v}
              className={thumbClass(picked.bar === v)}
              onClick={() => pick("bar", v)}
            >
              <div className="pointer-events-none h-20">
                <BarChart
                  data={miniRows}
                  config={miniConfig}
                  interactive={false}
                  margins={{ top: 6, right: 6, bottom: 6, left: 6 }}
                >
                  <Bar dataKey="v" variant={v} />
                </BarChart>
              </div>
              <div className={thumbLabel(picked.bar === v)}>{v}</div>
            </button>
          ))}
        </div>
        <PropsTable rows={API.cartesian} />
      </section>

      {/* Pie */}
      <section id="pie" className="mt-16 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg tracking-tight">Pie Chart</h2>
          <a
            href={`${routePath("/studio")}#new/pie`}
            className="-m-2 shrink-0 p-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Open a new pie chart in the studio"
          >
            open in studio →
          </a>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Browser share as a donut — click a slice or legend entry to isolate it.
        </p>
        <DemoCard code={pieCode}>
          <div className="h-64">
            <PieChart
              data={pieRows}
              config={pieConfig}
              dataKey="value"
              nameKey="name"
              innerRadius={0.55}
              replayToken={galleryReplay.pie}
            >
              <Pie variant={picked.pie} />
              <Legend align="center" isClickable />
            </PieChart>
          </div>
        </DemoCard>
        <h3 className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">variants</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={picked.pie === v}
              className={thumbClass(picked.pie === v)}
              onClick={() => pick("pie", v)}
            >
              <div className="pointer-events-none h-24">
                <PieChart data={miniPieRows} config={miniPieConfig} dataKey="value" nameKey="name" innerRadius={0.5}>
                  <Pie variant={v} />
                </PieChart>
              </div>
              <div className={thumbLabel(picked.pie === v)}>{v}</div>
            </button>
          ))}
        </div>
        <PropsTable rows={API.pie} />
      </section>

      {/* Radar */}
      <section id="radar" className="mt-16 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg tracking-tight">Radar Chart</h2>
          <a
            href={`${routePath("/studio")}#new/radar`}
            className="-m-2 shrink-0 p-2 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Open a new radar chart in the studio"
          >
            open in studio →
          </a>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Sprint health across five axes, this sprint against the last.
        </p>
        <DemoCard code={SNIPPETS.radar}>
          <div className="h-72">
            <RadarChart data={radarRows} config={radarConfig} dataKey="" nameKey="axis">
              <Radar dataKey="current" />
              <Radar dataKey="previous" />
              <Legend align="center" />
            </RadarChart>
          </div>
        </DemoCard>
        <PropsTable rows={API.radar} />
      </section>

      {/* Sparkline */}
      <section id="sparkline" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Sparkline</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A plain numeric series with zero margins — built for stat cards,
          table cells and dashboard rows.
        </p>
        <DemoCard code={SNIPPETS.sparkline}>
          <div className="grid gap-4 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-lg border border-border/60 p-4">
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg tracking-tight tabular-nums">{s.value}</span>
                  <span
                    className="text-[11px] tabular-nums"
                    style={{ color: cssColor(s.up ? "green" : "red") }}
                  >
                    {s.delta}
                  </span>
                </div>
                <Sparkline data={s.data} color={s.color} class="mt-3 h-8 w-full" />
              </div>
            ))}
          </div>
        </DemoCard>
        <PropsTable rows={API.sparkline} />
      </section>

      {/* Button */}
      <section id="button" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Button</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Canvas-filled button; density lifts on hover, blooms on press.
          Four fills, seven colors, optional <code className="text-foreground/80">bloom</code>, and static/precompiled raster paths.
        </p>
        <DemoCard code={buttonCode}>
          <div className="grid justify-items-center gap-8">
            <DitherButton color={btn.color} variant={btn.variant} bloom={btn.bloom} class="px-6 py-3 text-[13px]">
              Deploy
            </DitherButton>
            <div className="grid justify-items-center gap-3">
              <div className="flex items-center gap-1 rounded-md border border-border/60 p-1">
                {VARIANTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={btn.variant === v}
                    className={chipClass(btn.variant === v)}
                    onClick={() => setBtn((prev) => ({ ...prev, variant: v }))}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 rounded-md border border-border/60 p-1">
                {BLOOMS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    aria-pressed={btn.bloom === b}
                    className={chipClass(btn.bloom === b)}
                    onClick={() => setBtn((prev) => ({ ...prev, bloom: b }))}
                  >
                    bloom {b}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {BUTTON_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    aria-pressed={btn.color === c}
                    className={`size-6 rounded-[4px] transition-transform ${
                      btn.color === c
                        ? "ring-1 ring-foreground ring-offset-2 ring-offset-background"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: cssColor(c) }}
                    onClick={() => setBtn((prev) => ({ ...prev, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>
        </DemoCard>
        <PropsTable rows={API.button} />
      </section>

      {/* Avatar */}
      <section id="avatar" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Avatar</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Deterministic identicon — the same name always draws the same face,
          at any size.
        </p>
        <DemoCard code={avatarCode}>
          <div className="flex items-end justify-center gap-3">
            <DitherAvatar name={avatarName} size={24} replayToken={avatarReplay} />
            <DitherAvatar name={avatarName} size={32} replayToken={avatarReplay} />
            <DitherAvatar name={avatarName} size={48} replayToken={avatarReplay} />
            <DitherAvatar name={avatarName} size={64} replayToken={avatarReplay} />
          </div>
        </DemoCard>
        <h3 className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">names</h3>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {AVATAR_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={avatarName === n}
              className={thumbClass(avatarName === n)}
              onClick={() => pickAvatar(n)}
            >
              <div className="pointer-events-none flex justify-center">
                <DitherAvatar name={n} size={40} animate={false} />
              </div>
              <div className={thumbLabel(avatarName === n)}>{n}</div>
            </button>
          ))}
        </div>
        <PropsTable rows={API.avatar} />
      </section>

      {/* Gradient */}
      <section id="gradient" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Gradient</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A background wash that fades through the Bayer matrix instead of alpha —
          four directions, any palette color.
        </p>
        <DemoCard code={gradientCode}>
          <div className="grid gap-5">
            <div className="relative h-40 overflow-hidden rounded-md">
              <DitherGradient from={grad.from} to="transparent" direction={grad.direction} />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-1 rounded-md border border-border/60 p-1">
                {DIRECTIONS.map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    aria-pressed={grad.direction === dir}
                    className={chipClass(grad.direction === dir)}
                    onClick={() => setGrad((prev) => ({ ...prev, direction: dir }))}
                  >
                    {dir}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    aria-pressed={grad.from === c}
                    className={`size-6 rounded-[4px] transition-transform ${
                      grad.from === c
                        ? "ring-1 ring-foreground ring-offset-2 ring-offset-background"
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: cssColor(c) }}
                    onClick={() => setGrad((prev) => ({ ...prev, from: c }))}
                  />
                ))}
              </div>
            </div>
          </div>
        </DemoCard>
        <PropsTable rows={API.gradient} />
      </section>

      {/* Image */}
      <section id="image" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Image</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Ordered-dithers any image into chunky cells; edges can dissolve
          into the page. Below: the site&apos;s own sprite sheet run through it.
        </p>
        <DemoCard code={SNIPPETS.image}>
          <DitherImage
            src={assetPath("/sprites.webp")}
            alt="The dither-ui sprite sheet, re-dithered"
            cell={3}
            focusY={0.62}
            fade={72}
            class="h-64 w-full"
          />
        </DemoCard>
        <PropsTable rows={API.image} />
      </section>

      {/* Palette */}
      <section id="palette" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Palette</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Seven seeded colors; every component resolves fill, line and sparkle
          hues from the same seed, so a dashboard stays coherent for free.
        </p>
        <DemoCard code={SNIPPETS.palette}>
          <div className="grid gap-3">
            {COLORS.map((c) => (
              <div key={c} className="flex items-center gap-4">
                <span className="w-14 text-[11px] text-muted-foreground">{c}</span>
                <span className="size-5 rounded-[3px]" style={{ backgroundColor: cssColor(c) }} />
                <Sparkline data={wave} color={c} class="h-6 flex-1" />
              </div>
            ))}
          </div>
        </DemoCard>
        <PropsTable rows={API.palette} />
      </section>
    </>
  );
}
