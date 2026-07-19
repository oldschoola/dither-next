/**
 * Code-tab snippets + API tables shared across the docs packs.
 *
 * Verbatim port of the `SNIPPETS` and `API` consts in
 * `src/pages/docs/DocsPage.vue` (script section, lines 513-715 and 228-385).
 *
 * These strings are documentation snippets shown in the Code tab — they use
 * Vue syntax on purpose (the docs contract: "what you see is what you copy"
 * reflects the Vue kit API the reader is learning). They are NOT executable
 * React.
 */
import type { PropRow } from "./PropsTable";

export const SNIPPETS = {
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
  motion: `const replayToken = ref(0)

<BarChart :data="rows" :config="config"
  :animation-duration="900" :replay-token="replayToken">
  <Bar data-key="revenue" />
</BarChart>

<DitherButton @click="replayToken++">Replay</DitherButton>
<!-- prefers-reduced-motion is respected automatically:
     entrances snap, sparkles hold still -->`,
} as const;

export const API: Record<string, PropRow[]> = {
  motion: [
    { prop: "animate", type: "boolean", default: "true" },
    { prop: "animation-duration", type: "number (ms)", default: "900" },
    { prop: "animation-delay", type: "number (ms)", default: "0" },
    { prop: "replay-token", type: "number — bump to re-run", default: "0" },
    { prop: "effect", type: "number — dedicated edge-motion seed", default: "master seed / gentle" },
  ],
};
