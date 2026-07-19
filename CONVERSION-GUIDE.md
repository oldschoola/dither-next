# dither-ui Vue 3 → React 19 / Next.js 15 Conversion Guide

Operational reference for porting `dither-kit/` `.vue` SFCs to `.tsx` in
`dither-next/dither-kit/` and the `src/` FSD app to `dither-next/src/`. This guide
is grounded in the actual contents of all 71 `.vue` SFCs and the chart engine in
`dither-kit/*.ts`. A component-port worker can follow it mechanically.

Conventions are normative ("MUST", "SHOULD") where stated. Examples use the real
props and shapes from the Vue kit.

---

## Table of Contents

1. [Component authoring conventions](#1-component-authoring-conventions)
2. [Reactivity & lifecycle mapping](#2-reactivity--lifecycle-mapping)
3. [Context: provide/inject → createContext/useContext](#3-context-provideinject--createcontextusecontext)
4. [Props, emits, v-model, slots](#4-props-emits-v-model-slots)
5. [Template directives → JSX](#5-template-directives--jsx)
6. [Styling: cn(), scoped styles, Transitions](#6-styling-cn-scoped-styles-transitions)
7. [Template refs, nextTick, directives](#7-template-refs-nexttick-directives)
8. [Chart children-as-config API](#8-chart-children-as-config-api)
9. [Canvas / RAF / IntersectionObserver patterns](#9-canvas--raf--intersectionobserver-patterns)
10. [Per-component port table](#10-per-component-port-table)
11. [App port outline (src FSD → Next.js App Router)](#11-app-port-outline-src-fsd--nextjs-app-router)
12. [Foundation dependencies (what the foundation worker must land first)](#12-foundation-dependencies)

---

## 1. Component authoring conventions

**Canonical rule: every kit component is a named `function` component with a
typed `Props` interface.** Do NOT use `React.FC`.

Rationale: `React.FC` adds nothing in React 19 (children is a normal prop now),
obscures generic signatures, and fights the kit's pervasive render-prop and
config-component patterns. Function declarations give cleaner stack traces and
allow `export function` + `export type` co-location mirroring the Vue SFC's
`<script setup>` + `defineProps` shape.

```tsx
// dither-next/dither-kit/DitherKbd.tsx
import { cn } from "./lib";
import type { CSSProperties } from "react";

export interface DitherKbdProps {
  children: React.ReactNode;
  class?: string;
}

export function DitherKbd({ children, class: className }: DitherKbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-card px-1.5 font-mono text-[11px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
```

**File layout**: one component per `.tsx` file, `PascalCase.tsx`, mirroring
`PascalCase.vue`. The default export MUST be the component function; named
exports for types. Keep the `index.ts` barrel grouping identical to
`dither-kit/index.ts` (Charts+Parts, Standalone, Controls, Overlays, Navigation,
Feedback, Structure, Fields) so the Studio registry port can be mechanical.

**Client vs server**: every kit component that touches `canvas`, `ResizeObserver`,
`IntersectionObserver`, `requestAnimationFrame`, or `matchMedia` MUST be a Client
Component (`"use client"` at file top). Pure render components (DitherKbd,
DitherFieldset, DitherBreadcrumb, DitherStepper, DitherBadge content) MAY stay as
Server Components, but because the kit is consumed by Studio (interactive),
default to `"use client"` for anything with `useState`/`useEffect`/`useRef`.

---

## 2. Reactivity & lifecycle mapping

| Vue | React 19 | Notes |
|---|---|---|
| `ref(0)` | `useState(0)` | primitive state that re-renders |
| `ref<HTMLElement\|null>(null)` | `useRef<HTMLElement\|null>(null)` | mutable container, no re-render |
| `shallowRef({w,h})` | `useState({w,h})` | see `useChartDimensions` below |
| `reactive({...})` | `useState` + explicit setters, OR `useReducer` | editor store → `useSyncExternalStore` (see §11) |
| `computed(() => …)` | `useMemo(() => …, [deps])` | MUST list every reactive read in deps |
| `watch(source, cb, {immediate:true})` | `useEffect(() => cb(), [deps])` + call on mount, OR `useLayoutEffect` for DOM-measure-then-paint |
| `watch(source, cb)` (non-immediate) | `useEffect(() => cb(), [deps])` skipping first run via a ref guard | rare in the kit |
| `watchEffect(() => …)` | `useEffect(() => …)` with no dep-array optimization | auto-tracks; in React, enumerate deps |
| `watch([a,b,c], cb, {flush:"post"})` | `useEffect` (post-paint by default) | `flush:"pre"` → `useLayoutEffect` |
| `onMounted(fn)` | `useEffect(() => { fn(); return cleanup }, [])` | empty dep array = mount |
| `onBeforeUnmount(fn)` | return `cleanup` from `useEffect` | same effect that set it up |
| `onMounted` + `onBeforeUnmount` pair | single `useEffect` with setup + returned cleanup | NEVER split |
| `nextTick(fn)` (DOM read after state) | `flushSync(() => setState(x))` then read synchronously in the same handler | see §7 — only in event handlers, NEVER inside effects |
| `nextTick(fn)` (generic defer) | `useEffect(() => fn(), [deps])` | prefer this when no synchronous DOM read is needed |
| `defineAsyncComponent({loader, loadingComponent, delay})` | `next/dynamic(() => import(...), { loading: ..., ssr: false })` | App.vue DocsPage/StudioPage, StudioPage ExportDialog |

**Dep-array rules (non-negotiable):**

1. Every value from props, state, context, or `useMemo`/`useRef`-derived state
   that the effect reads MUST be in the array.
2. Stable identities only: callbacks from `useCallback`, refs (`.current` is
   exempt — read freely), context values. If you pass an inline callback as a
   prop, either `useCallback` it or accept it will re-run the effect.
3. Empty array `[]` = mount-only. This is the correct translation of Vue's
   `onMounted` + `onBeforeUnmount` pair.
4. NEVER use `useEffect` to transform props into other props — that's
   `useMemo` or direct computation in render. The Vue kit does this with
   `computed`; React renders are cheap, so derive in render.

**`watch` with `{ immediate: true }` → effect that also runs on mount:**

```vue
<!-- Vue: CartesianSeries.vue -->
watch(
  () => [props.dataKey, props.kind, props.variant, props.strokeVariant, props.opacity] as const,
  ([dataKey, kind, variant, strokeVariant, opacity]) =>
    ctx.registerSeries({ dataKey, kind, variant, strokeVariant, opacity }),
  { immediate: true }
)
onBeforeUnmount(() => ctx.unregisterSeries(props.dataKey))
```

```tsx
// React: CartesianSeries.tsx
const { registerSeries, unregisterSeries } = ctx;
useEffect(() => {
  registerSeries({ dataKey, kind, variant, strokeVariant, opacity });
  return () => unregisterSeries(dataKey);
}, [ctx, dataKey, kind, variant, strokeVariant, opacity, registerSeries, unregisterSeries]);
```

Note: the Vue version separates registration (immediate watch) from
unregistration (`onBeforeUnmount`). In React these collapse into ONE effect —
register in the body, unregister in the cleanup. This is the canonical pattern
for every "register on mount, unregister on unmount" shape in the kit (series,
variants, toasts, drawer channel membership).

---

## 3. Context: provide/inject → createContext/useContext

The Vue kit uses `provide` + `InjectionKey<T>` + `inject(key, null)` with a
boundary-guard accessor hook (`useChartPart`, `useSeries`, `useField`, etc.). The
React port preserves this shape exactly.

**Canonical pattern:**

```tsx
// chart-context.ts (React port — foundation worker owns this)
import { createContext, useContext } from "react";

export type ChartContextValue = { /* …same shape as Vue… */ };
export const ChartContext = createContext<ChartContextValue | null>(null);

export function useChart(): ChartContextValue {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error("Chart parts must be used within a chart root (e.g. <AreaChart />).");
  return ctx;
}

export function useChartPart(part: string, kind?: ChartType | ChartType[]): ChartContextValue {
  const ctx = useContext(ChartContext);
  if (!ctx) {
    const where = kind ? ROOT_OF[Array.isArray(kind) ? kind[0] : kind] : "a chart root";
    throw new Error(`<${part} /> must be used within ${where}.`);
  }
  if (kind) {
    const allowed = Array.isArray(kind) ? kind : [kind];
    if (!allowed.includes(ctx.chartType)) {
      throw new Error(/* same message as Vue */);
    }
  }
  return ctx;
}
```

**Contexts the foundation worker is porting (hook names — component workers MUST
use these):**

| Vue InjectionKey | React context + hook | Provided by |
|---|---|---|
| `ChartKey` | `ChartContext` / `useChart()` / `useChartPart()` | `AreaChart`, `LineChart`, `BarChart` |
| `PolarChartKey` | `PolarChartContext` / `usePolarChart()` / `usePolarPart()` | `PieChart`, `RadarChart` |
| `CommonChartKey` | `CommonChartContext` / `useCommonChart()` | every chart root |
| `SeriesKey` | `SeriesContext` / `useSeries()` | `CartesianSeries` (and thus `Area`/`Line`/`Bar`) |
| `FIELD_CONTEXT` | `FieldContext` / `useField()` | `DitherField` |
| `SIDEBAR_COLLAPSED` / `SIDEBAR_COMPACT` | `SidebarContext` / `useSidebar()` | `DitherSidebar` |
| `TABS_CTX` | `TabsContext` / `useTabs()` | `DitherTabs` |
| `DRAWER_CHANNEL` | `DrawerChannelContext` / `useDrawerChannel()` | `DitherDrawerIndent` (app-level provider) |
| (reactive module) `toast` / `toasts[]` | `ToastStoreContext` / `useToasts()` + `toast()` | `DitherToaster` + a `<ToastProvider>` at app root |

**Provider shape:** React 19 uses `<Context value={x}>` (children is just a prop
on the provider element). The kit's Vue `provide(ChartKey, ctx)` inside a root's
`setup` becomes `<ChartContext value={ctx}>` wrapping the children in the root
component's JSX. Every chart root MUST render its provider around the routed
children (see §8).

**The `common` facade:** The Vue controller exposes a `common: CommonChart`
object built with `markRaw({ get names() {…}, … })` — a getter facade over
reactive state. In React, build the `common` object inside `useMemo` capturing
the same primitives; because it's consumed via `useContext`, consumers re-render
when the context value identity changes. The controller (foundation worker) must
decide context value identity carefully — see §8 for the chart controller memo
strategy.

---

## 4. Props, emits, v-model, slots

### defineProps → typed Props interface

```vue
<!-- Vue -->
const props = withDefaults(
  defineProps<{ dataKey: string; variant?: VariantInput; isClickable?: boolean; opacity?: number }>(),
  { variant: "gradient", isClickable: false, opacity: 1 }
)
```

```tsx
// React
export interface DitherAreaProps {
  dataKey: string;
  variant?: VariantInput;
  isClickable?: boolean;
  opacity?: number;
}
export function Area({ dataKey, variant = "gradient", isClickable = false, opacity = 1 }: DitherAreaProps) { … }
```

Default values move from `withDefaults` to destructuring defaults. `withDefaults`
over `defineProps<{…}>()` maps 1:1.

### defineEmits → callback props (onXxx)

```vue
<!-- Vue: DitherDialog.vue -->
const emit = defineEmits<{ close: [] }>()
emit("close")
```

```tsx
// React
export interface DitherDialogProps {
  open: boolean;
  onClose: () => void;  // emit("close") → onClose()
}
```

Event names `kebab-case` in Vue templates (`@close`) become `onClose` props.
Multi-arg emits `defineEmits<{ (e: "hoverChange", index: number | null): void }>()`
become `onHoverChange: (index: number | null) => void`.

### v-model → value + onChange (one-way + callback)

The Vue kit uses `modelValue` + `emit("update:modelValue", v)` (classic v-model,
NOT `defineModel`). Translation:

```vue
<!-- Vue: DitherInput.vue -->
const props = withDefaults(defineProps<{ modelValue?: string }>(), { modelValue: "" })
const emit = defineEmits<{ (e: "update:modelValue", value: string): void }>()
emit("update:modelValue", e.target.value)
```

```tsx
// React
export interface DitherInputProps {
  value?: string;                 // was modelValue
  onChange?: (value: string) => void;   // was update:modelValue
}
export function DitherInput({ value = "", onChange, ...rest }: DitherInputProps) {
  return <input value={value} onChange={(e) => onChange?.(e.target.value)} … />;
}
```

**Naming convention (MUST follow everywhere):**

| Vue | React |
|---|---|
| `modelValue` / `v-model` | `value` |
| `update:modelValue` emit | `onChange` |
| `v-model:layers-open` | `layersOpen` prop + `onLayersOpenChange` |
| `v-model:selected-id` | `selectedId` prop + `onSelectedIdChange` |

For grouped v-model (`v-model:layers-open` + `v-model:inspector-open` on
`Toolbar`), each named model becomes its own `value`/`onChange` pair with the
name prefix: `layersOpen`/`onLayersOpenChange`.

**Two-way binding decision:** the kit's `v-model` is almost always parent-owned
state. In React, the parent holds `useState` and passes `value` + `onChange`.
For components that also need internal transient state (e.g. `DitherSelect`
highlighted index), keep that in local `useState` and only lift the committed
value to the `value`/`onChange` contract.

### slots → children + named render props

```vue
<!-- Vue: DitherDialog.vue -->
<slot />
<footer v-if="$slots.footer"><slot name="footer" /></footer>
```

```tsx
// React
export interface DitherDialogProps {
  children?: React.ReactNode;
  footer?: React.ReactNode;   // named slot → named ReactNode prop
  open: boolean;
  onClose: () => void;
}
export function DitherDialog({ children, footer, open, onClose }: DitherDialogProps) {
  return open ? (
    <Portal>
      <div role="dialog">
        {children}
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </Portal>
  ) : null;
}
```

- Default slot → `children: React.ReactNode`.
- Named slot → named `React.ReactNode` prop (`footer`, `trigger`, `icon`).
- Scoped slots (`<slot :item="row" />`) → render prop: `children: (item: T) => React.ReactNode` or `renderItem`. The kit's charts use scoped slots only via the
  config API (§8), not for content. `DitherTabs`/`DitherSelect`/`DitherMenu` use
  `label` props on item objects, not scoped slots — keep that.

---

## 5. Template directives → JSX

### v-if / v-else / v-else-if → conditional expression

```vue
<g v-if="ctx.ready && band">…</g>
<h2 v-if="title">{{ title }}</h2>
<p v-else>fallback</p>
```

```tsx
{ctx.ready && band ? <g>…</g> : null}
{title ? <h2>{title}</h2> : <p>fallback</p>}
```

### v-show → conditional `hidden` or style

```vue
<canvas v-show="open" />
```
```tsx
<canvas hidden={!open} />
```
Prefer `hidden` attr for pure toggle (keeps DOM, no remount). The kit uses
`v-show` on `DitherCheckbox`'s check and `DitherTabPanel` — translate to `hidden`.

### v-for → .map() with key

```vue
<text v-for="t in ctx.y.ticks(tickCount)" :key="t" :x="…" />
<rect v-for="(r, i) in rects" :key="i" :x="r.x" />
```
```tsx
{ctx.y.ticks(tickCount).map((t) => <text key={t} x={…} />)}
{rects.map((r, i) => <rect key={i} x={r.x} />)}
```
Key rule: use a stable identity, not array index when items reorder. The Vue kit
often uses `:key="i"` on static lists (ticks, band points) — fine to keep `key={i}`
for those, but `DitherPagination`/`DitherSidebarItem` lists need real ids.

### v-bind:class / :class → cn()

Already `cn()` in Vue (see §6). Translates directly to `className={cn(...)}`.
Vue's object/conditional class syntax `:class="{ active: open, 'opacity-40': dimmed }"`
becomes `cn(open && "active", dimmed && "opacity-40")` via clsx.

### v-on / @ / modifiers

```vue
@click="onClick"                    → onClick={onClick}
@pointerenter="enter"               → onPointerEnter={enter}
@input="emit('update:modelValue', $event.target.value)"
                                     → onChange={(e) => onChange?.(e.target.value)}
@submit.prevent="onSubmit"          → <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
@click.self="close"                 → onClick={(e) => { if (e.target === e.currentTarget) close(); }}
```
`.prevent` / `.stop` have no JSX modifier — inline the logic or extract a helper.
`.self` → guard `e.target === e.currentTarget`.

### v-bind="$attrs" → rest spread

```vue
<!-- DitherInput.vue uses defineOptions({ inheritAttrs: false }) + v-bind="$attrs" -->
<input v-bind="$attrs" … />
```
```tsx
export function DitherInput({ value, onChange, ...rest }: DitherInputProps) {
  return <input value={value} onChange={(e) => onChange?.(e.target.value)} {...rest} />;
}
```
`inheritAttrs: false` + `v-bind="$attrs"` is the Vue equivalent of collecting
rest props and spreading them. In React this is the default behavior — just
destructure the known props and spread `...rest` onto the root element. Remove
the `id`/`aria-describedby` manual forwarding if `useField` still provides them;
otherwise keep the merge logic from `DitherInput` (explicit `id` wins over
field's `controlId`).

### Template fragments / `<template v-for>`

The chart roots use `flatten(slots.default?.())` to walk vnodes and route by
`chartLayer`. In React this becomes `React.Children.toArray(children)` — see §8.

---

## 6. Styling: cn(), scoped styles, Transitions

### cn() helper

The kit already uses `cn()` from `dither-kit/lib.ts` (`twMerge(clsx(...))`).
**Keep it verbatim** — copy `lib.ts` into `dither-next/dither-kit/lib.ts`
unchanged. No new dependency; `clsx` + `tailwind-merge` are already in the
foundation scaffold.

### Tailwind classes

Every class string in the kit (e.g. `CONTROL`, `CONTROL_BUTTON`, `POPOVER` from
`control.ts`) transfers verbatim to JSX `className`. Tailwind v4 in the Next.js
scaffold MUST mirror the token CSS vars from `src/app/styles.css` (background,
foreground, border, accent, popover, card, muted-foreground) so the same classes
resolve. The foundation worker owns the `globals.css` token port.

### Scoped styles → CSS Modules or co-located CSS

Vue `<style scoped>` is used by ~10 components (Tooltip, Dialog, Drawer,
Popover, Select, Combobox, Tabs, StudioPage, etc.) for transition keyframes and
scrollbar styling. Translation:

- **Transition CSS** (`.dk-tooltip-enter-active`, `.dk-dialog-enter-active`):
  move to a single `dither-kit/transitions.css` imported once at the kit entry,
  OR use Tailwind v4's `@custom-variant` + transition utilities. Prefer a
  co-located `*.module.css` per component for isolation.
- **Scrollbar styling** (`DitherScrollArea`): a `*.module.css` file.
- **Studio panel styles** (`StudioPage.vue`): app-level CSS module.

The scoped attribute selector Vue adds (`[data-v-xxxx]`) has no React
equivalent — CSS Modules' generated class names are the replacement.

### `<Transition>` / `<TransitionGroup>` → CSS transitions (preferred)

The kit's transitions are deliberately CSS-only glide/opacity animations (see
`Tooltip.vue` comment: "Replaces the React `motion` spring with native CSS — no
dependency"). Translate to the **CSS-transition pattern**: keep the element
mounted, toggle a class, and let CSS animate. Do NOT introduce
`react-transition-group` or `framer-motion` for these.

```vue
<!-- Vue: Tooltip.vue -->
<Transition name="dk-tooltip">
  <div v-if="show" class="dk-tooltip-card">…</div>
</Transition>
<style scoped>
.dk-tooltip-enter-active, .dk-tooltip-leave-active { transition: opacity 180ms ease; }
.dk-tooltip-enter-from, .dk-tooltip-leave-to { opacity: 0; }
</style>
```
```tsx
// React: Tooltip.tsx — render-and-toggle, no enter/leave juggling
export function Tooltip({ show, children }: TooltipProps) {
  return (
    <div className={cn("dk-tooltip-card", show ? "dk-tooltip-show" : "dk-tooltip-hide")}>
      {children}
    </div>
  );
}
// transitions.module.css
.dkTooltipCard { transition: opacity 180ms ease; }
.dkTooltipHide { opacity: 0; }
```

For mount/unmount transitions (Dialog, Drawer, Popover where the DOM appears and
must animate in, then unmount after leave), use a tiny `usePresence` hook (a
local `useState` + `setTimeout` matching the CSS duration) OR accept
`react-transition-group`'s `CSSTransition` as the ONE allowed transition dep.
**Recommendation: a local ~20-line `usePresence` hook** — the kit already
avoided motion libs by design, honor that. Flag any dep addition in the PR.

`<TransitionGroup>` (used by `DitherToaster` for the toast list FLIP animation)
→ `react-transition-group`'s `<TransitionGroup>` is the cleanest port, OR
implement FLIP manually with a `useLayoutEffect` measuring before/after. The
toaster is the single place a TransitionGroup is genuinely needed.

### `<Teleport to="body">` → createPortal

```vue
<Teleport to="body"><div class="fixed inset-0 z-50 …">…</div></Teleport>
```
```tsx
import { createPortal } from "react-dom";
return createPortal(<div className="fixed inset-0 z-50 …">…</div>, document.body);
```
Used by: DitherDialog, DitherAlertDialog, DitherDrawer, DitherContextMenu,
DitherToaster. In SSR, guard `typeof document !== "undefined"` or mount the
portal only after `useEffect` (the component is already client-only via
`"use client"`).

---

## 7. Template refs, nextTick, directives

### Template refs (`ref="el"`, `useTemplateRef`)

```vue
<canvas ref="canvasRef" />
const canvasRef = ref<HTMLCanvasElement | null>(null)
```
```tsx
const canvasRef = useRef<HTMLCanvasElement | null>(null);
<canvas ref={canvasRef} />
```

**Array refs** (Vue 3.5 `ref="inputs"` over a `v-for`, or `:ref` callback
collecting into an array) — used by `DitherOtpField`, `DitherRadioGroup`,
`DitherToggleGroup`, `DitherMenu`, `DitherMenubar`, `DitherSidebar`:

```vue
<input v-for="(_, i) in n" :key="i" :ref="(el) => (inputs[i] = el)" />
```
```tsx
const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
// in render:
{Array.from({ length: n }).map((_, i) => (
  <input key={i} ref={(el) => { inputsRef.current[i] = el; }} />
))}
// clear on unmount / length change via effect, or use a Map<number, HTMLElement>
```
Prefer a `Map` or an array you null-out in a cleanup effect over Vue's index
assignment to avoid stale refs on reorder.

### nextTick → flushSync or useEffect

The kit uses `nextTick` for two distinct reasons — keep them straight:

1. **Read DOM after a state-driven render** (e.g. `DitherDialog` focuses the
   close button after `open` flips true, `DitherSelect` measures the panel):
   ```ts
   // React: force the pending render to commit synchronously, then read DOM
   flushSync(() => setOpen(true));
   closeRef.current?.focus();
   ```
   `flushSync` is the faithful translation. **MUST be called from an event
   handler or lifecycle, NEVER inside `useEffect`/`useLayoutEffect`** (React
   warns and ignores it). If the read must happen in an effect, use
   `useLayoutEffect` — it runs after DOM mutation, before paint, which is the
   correct phase for measure-then-focus.

2. **Generic defer to after the current job queue** (rare; the kit mostly uses
   RAF for this — see §9): translate to `useEffect(() => fn(), [deps])`.

Rule of thumb: `nextTick` + DOM read in an event handler → `flushSync`.
`nextTick` + DOM read in a watcher/effect → `useLayoutEffect`.

### Directives

The kit has **no custom Vue directives** (`v-focus-trap`, `v-intersection-observer`
etc. are NOT present — all such behavior is in composables). Focus trapping is
hand-rolled in `DitherDialog`/`DitherAlertDialog` via a `focusable()` query +
Tab key handler. Translate that logic verbatim into a `useFocusTrap(ref, active)`
hook. Do NOT add `react-focus-lock` — the existing implementation is dependency-
free and a11y-correct (Escape to close, Tab cycling, restore previous focus on
unmount).

---

## 8. Chart children-as-config API

This is the trickiest port. The Vue kit authoring shape (from the README) is:

```vue
<AreaChart :data="rows" :config="cfg" :seed="42">
  <Area dataKey="revenue" />
  <Line dataKey="forecast" />
  <Bar dataKey="volume" />
  <Grid vertical />
  <XAxis dataKey="month" />
  <YAxis />
  <Legend isClickable />
  <Tooltip />
</AreaChart>
```

### How Vue does it

`defineCartesianChart` / `definePolarChart` call `flatten(slots.default?.())` in
their render function, classify each child vnode by `layerOf(node)` (reads
`node.type.chartLayer` — a static field set via `defineOptions({ chartLayer:
"back" | "dom" })` on `Grid`, `RadarFrame`, `Legend`, `Tooltip`), and route into
three layer arrays: `back` (SVG behind canvas), `svg` (SVG in front), `dom`
(absolutely positioned HTML like Legend/Tooltip).

Series parts (`<Area>`, `<Line>`, `<Bar>`, `<Pie>`, `<Radar>`) are NOT rendered
as visual output by themselves — they register a `SeriesSpec` / variant into the
chart context via `watch(immediate)` + `provide(SeriesKey, …)`. The canvas
painter (the `canvas` component passed to `defineCartesianChart`) reads
`ctx.seriesSpecs` / `ctx.variantOf` each frame and paints accordingly.

So a chart child is either:
- a **config marker** (Area/Bar/Line/Pie/Radar — registers into context, renders
  `<g/>` or a transparent hit area + its own `<slot/>` for markers), or
- a **layer part** (Grid/XAxis/YAxis/RadarFrame = `back`; Legend/Tooltip = `dom`;
  Dot/ActiveDot = `svg`, rendered inside a series' slot).

### The React port: children-as-config via component identity

Use `React.Children.toArray(children)` + component identity (`child.type` is one
of the marker components) to route. Marker components render `<g/>` (or the
transparent hit rect) AND register via `useEffect` into the chart context they
consume — same as Vue, minus the vnode inspection for *registration* (that stays
on the component). The parent root only needs to inspect children to decide the
**render layer** (`back` vs `svg` vs `dom`), mirroring `layerOf`.

**Concrete pattern:**

```tsx
// dither-next/dither-kit/chart-layers.ts
import type { ComponentType, ReactNode } from "react";

// A marker component opts into a render layer by setting a static field.
// This mirrors Vue's defineOptions({ chartLayer: "back" | "dom" }).
export type ChartLayer = "back" | "svg" | "dom";
export interface LayeredComponent {
  chartLayer?: ChartLayer;
}

export function layerOf(node: ReactNode): ChartLayer {
  if (!node || typeof node !== "object" || !("type" in node)) return "svg";
  const t = (node as { type?: LayeredComponent | unknown }).type;
  if (t && typeof t === "function" && "chartLayer" in t) {
    return (t as LayeredComponent).chartLayer ?? "svg";
  }
  return "svg";
}

// Flatten fragments so <></> and conditionals route each real child.
export function flattenChildren(children: ReactNode): ReactNode[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (child && typeof child === "object" && "type" in child && (child as any).type === Symbol.for("react.fragment")) {
      return flattenChildren((child as any).props.children);
    }
    return child;
  });
}
```

```tsx
// dither-next/dither-kit/AreaChart.tsx (cartesian root — concrete chart)
"use client";
import { useRef } from "react";
import { ChartContext, useChartController, type ChartContextValue } from "./chart-context";
import { CartesianCanvas } from "./cartesian-canvas";
import { useChartDimensions } from "./use-chart-dimensions";
import { cn } from "./lib";
import { flattenChildren, layerOf } from "./chart-layers";
import type { ReactNode } from "react";

export interface AreaChartProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
  seed?: number;
  margins?: Partial<Margins>;
  animate?: boolean;
  replayToken?: number;
  interactive?: boolean;
  hovered?: boolean;
  bloom?: BloomInput;
  bloomOnHover?: boolean;
  precompiled?: PrecompiledDither;
  defaultSelectedDataKey?: string | null;
  onHoverChange?: (index: number | null) => void;
  onSelectionChange?: (key: string | null) => void;
  class?: string;
  children?: ReactNode;
}

export function AreaChart(props: AreaChartProps) {
  const { el, size } = useChartDimensions<HTMLDivElement>();
  const margins = { ...DEFAULT_MARGINS, ...props.margins };
  const ctx: ChartContextValue = useChartController({ chartType: "area", /* …getters… */ });

  const children = flattenChildren(props.children);
  const back: ReactNode[] = [];
  const svg: ReactNode[] = [];
  const dom: ReactNode[] = [];
  for (const child of children) {
    const layer = layerOf(child);
    if (layer === "back") back.push(child);
    else if (layer === "dom") dom.push(child);
    else svg.push(child);
  }

  const { width, height } = size;
  const transform = `translate(${margins.left},${margins.top})`;

  return (
    <ChartContext value={ctx}>
      <div
        ref={el}
        className={cn("relative h-full w-full", props.class)}
        onPointerEnter={() => ctx.setMouseInChart(true)}
        onPointerMove={props.interactive ? (e) => onMove(e.clientX, ctx, el.current, margins, props.onHoverChange) : undefined}
        onPointerLeave={() => { ctx.setMouseInChart(false); ctx.setHoverIndex(null); props.onHoverChange?.(null); }}
      >
        {ctx.ready && back.length > 0 && (
          <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden role="presentation">
            <g transform={transform}>{back}</g>
          </svg>
        )}
        <CartesianCanvas />
        {ctx.ready && (
          <svg width={width} height={height} className="absolute inset-0 overflow-visible" role="img" aria-label="Chart">
            <g transform={transform}>{svg}</g>
          </svg>
        )}
        {dom}
      </div>
    </ChartContext>
  );
}
```

```tsx
// dither-next/dither-kit/Area.tsx (config marker)
"use client";
import { useEffect } from "react";
import { useChartPart } from "./chart-context";
import { SeriesContext } from "./series-context";
import type { VariantInput, StrokeVariant } from "./chart-context";

export interface AreaProps {
  dataKey: string;
  variant?: VariantInput;
  strokeVariant?: StrokeVariant;
  isClickable?: boolean;
  opacity?: number;
  children?: React.ReactNode;
}

export function Area({ dataKey, variant = "gradient", strokeVariant = "solid", isClickable = false, opacity = 1, children }: AreaProps) {
  const ctx = useChartPart("Area", "area");

  useEffect(() => {
    ctx.registerSeries({ dataKey, kind: "area", variant, strokeVariant, opacity });
    return () => ctx.unregisterSeries(dataKey);
  }, [ctx, dataKey, variant, strokeVariant, opacity]);

  const seriesValue = { dataKey, get seed() { return ctx.seedOf(dataKey); }, get dimmed() { /* … */ } };

  return <SeriesContext value={seriesValue}>{children}</SeriesContext>;
}
```

### Critical port notes for the chart API

1. **`defineOptions({ chartLayer })` → static field on the component function.**
   Set `AreaChart`/etc. do not need it (they're roots). `Grid.chartLayer = "back"`,
   `RadarFrame.chartLayer = "back"`, `Legend.chartLayer = "dom"`,
   `Tooltip.chartLayer = "dom"`. `layerOf` reads `Component.chartLayer`.

2. **`flatten` must handle fragments.** Vue's `flatten` recurses into
   `Fragment` vnodes. `React.Children.toArray` does NOT flatten fragments — the
   `flattenChildren` helper above does. `<>{<Grid/><XAxis/>}</>` must route both.

3. **Series markers render `<g>` (or nothing) — registration is the side
   effect.** The Vue `Pie.vue` / `Radar.vue` render literally `<g />` (empty) —
   they exist only to call `registerVariant`. Keep that: the component renders an
   empty fragment and registers via `useEffect`. `Bar`/`CartesianSeries` render a
   transparent hit `<rect>`/`<path>` for click targets when `isClickable`.

4. **Context value identity / controller memo.** The Vue controller is a single
   `markRaw` object whose getters delegate to `ref`s — reading `ctx.ready` in a
   template tracks the underlying ref, and the canvas RAF loop reads
   `state.value.configKeys` fresh each frame. In React, the controller is built
   in the root component and passed via `<ChartContext value={ctx}>`. The
   foundation worker MUST memoize the controller with `useMemo` keyed on the
   primitive inputs (size, margins, data identity, seed, replayToken, etc.) so
   the context value identity is stable across renders that don't change inputs,
   and updates when inputs do. **Subtle:** because the canvas RAF loop reads the
   controller imperatively (not via React render), the controller object should
   hold `ref`s to mutable interaction state (hoverIndex, cursorX, isMouseInChart,
   selectedDataKey, focusDataKey, seriesSpecs) so the RAF closure always reads
   fresh values WITHOUT needing a React re-render every frame. The Vue kit does
   exactly this via `ref` + getter facade. Port that: `useRef` for the mutable
   interaction fields, `useMemo` for the read-only derivations (bands, scales,
   plot size), and a single `useState` `revision` counter bumped by a
   `watch`-equivalent effect to trigger re-render when data/replayToken change.

5. **Boundary guards throw at render time.** `useChartPart` throws if no context.
   In React this throws during render — that's fine and matches Vue. The error
   surfaces in dev. Keep the error messages identical.

6. **`AreaChart`/`LineChart`/`BarChart` share one factory.** The Vue kit has
   `defineCartesianChart(chartType, canvas)` producing three components. In
   React, keep a `makeCartesianChart(chartType, Canvas)` factory returning a
   component function — do NOT copy-paste three roots. Same for
   `makePolarChart(chartType, canvas, backDecoration?)` → `PieChart`/`RadarChart`.

7. **`Sparkline` composes `AreaChart` + `Area`.** Keep that composition — it's
   the proof the API works as a building block, not just an end component.

---

## 9. Canvas / RAF / IntersectionObserver patterns

The kit renders dithered pixel art to `<canvas>` via `putImageData` on a
`willReadFrequently` context, with `RasterBuffer` as the portable backing store.
This is the kit's identity and the highest-risk port surface. The engine files
(`raster.ts`, `pixel.ts`, `dither-paint.ts`, `precompile.ts`, `palette.ts`,
`scales.ts`, `polar.ts`, `dot-paint.ts`, `avatar-pattern.ts`) are framework-
agnostic TypeScript — the foundation worker ports them verbatim (no Vue import).
Component workers only consume their exports.

### useChartDimensions (ResizeObserver) → hook port

```ts
// use-chart-dimensions.ts (React port — foundation owns, shape shown for component workers)
export function useChartDimensions<T extends HTMLElement>() {
  const el = useRef<T | null>(null);
  const [size, setSize] = useState<Dimensions>({ width: 0, height: 0 });
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      const w = Math.max(0, Math.round(e.contentRect.width));
      const h = Math.max(0, Math.round(e.contentRect.height));
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    });
    ro.observe(node);
    const fallback = window.setTimeout(() => {
      setSize((prev) => (!prev.width && !prev.height ? { width: node.clientWidth, height: node.clientHeight } : prev));
    }, 0);
    return () => { clearTimeout(fallback); ro.disconnect(); };
  }, []);
  return { el, size };
}
```

Use `contentRect`, NOT `getBoundingClientRect()` — the kit deliberately avoids
the latter so a parent transform morph can't lock the canvas to a scaled size
(see `use-chart-dimensions.ts` comment).

### useCanvasVisibility (IntersectionObserver) → hook port

```ts
// use-visibility.ts (React port)
export function useCanvasVisibility(
  el: Ref<HTMLElement | null>,
  onWake?: () => void,
): () => boolean {
  const visibleRef = useRef(typeof IntersectionObserver === "undefined");
  const [visible, setVisible] = useState(visibleRef.current);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !el.current) return;
    const io = new IntersectionObserver(([entry]) => {
      const v = entry?.isIntersecting ?? true;
      visibleRef.current = v;        // set BEFORE onWake so schedule() sees it
      setVisible(v);
      if (v) onWake?.();
    });
    io.observe(el.current);
    return () => io.disconnect();
  }, [el, onWake]);
  return () => visibleRef.current;   // imperative read for the RAF loop
}
```

**Hard rules from `dither-kit/AGENTS.md` (port MUST honor):**

1. **`{ willReadFrequently: true }`** on every primary canvas context that calls
   `putImageData`. Bloom canvases (draw-only, `drawImage`) OMIT the flag.
   `DitherButton`, `DitherToggle`/`DitherToggleGroup`, `DitherGradient`,
   `DitherImage`, `DitherAvatar`, `DitherSpinner`, `DitherBadge`, `DitherSlider`,
   `DitherSwitch`, `DitherRating`, `DitherMeter`, `DitherCollapsible`,
   `DitherSeparator`, `DitherProgress`, `DitherSkeleton`, `DitherTabs`,
   `DitherNavMenu`, `DitherRadioGroup`, `DitherCheckbox`, `DitherSidebarItem`,
   `DitherTimeline`, `DitherToaster`, and the chart canvases all use
   `willReadFrequently`.

2. **Canvas defaults to PAUSED until IntersectionObserver reports visible.** Do
   not start the RAF loop optimistically on mount. `onWake` resumes the SAME
   closure so timing/entrance state is preserved (no replay, no state loss).

3. **`prefers-reduced-motion`** via `pixelPrefersReducedMotion()` /
   `prefersReducedMotion()` — gate animation loops and entrance animations.
   Consumers must not opt in; the kit checks it internally. In React, read
   `window.matchMedia("(prefers-reduced-motion: reduce)")` inside the effect
   (not at module load — SSR).

4. **RAF deferral of `getBoundingClientRect`.** Standalone components
   (`DitherButton`, `DitherToggleGroup`) defer their initial `getBoundingClientRect`
   to `requestAnimationFrame` to avoid forced reflow during mount when many
   components mount at once. The Vue comment explicitly notes this beats
   `nextTick` (which runs inside Vue's `flushJobs` and forces sync layout).
   In React, the equivalent is: mount the canvas in the first render, then in a
   `useEffect` (which runs after paint) schedule a `requestAnimationFrame` that
   does the measure + first paint. `DitherButton`'s `restartRuntime` +
   `restartToken` guard becomes:
   ```tsx
   const restartToken = useRef(0);
   useEffect(() => {
     const token = ++restartToken.current;
     const raf = requestAnimationFrame(() => {
       if (token !== restartToken.current) return;
       teardownRef.current = init();
     });
     return () => cancelAnimationFrame(raf);
   }, [color, variant, bloom, cell, renderMode, loading, disabled, effMaxCols, effMaxRows, precompiled]);
   ```

5. **`RasterBuffer` + `putRasterBuffer`, not per-pixel `fillRect`.** The kit's
   `paintToggleCanvas` (shared by `DitherToggle`/`DitherToggleGroup`) uses
   `RasterBuffer` + `putRasterBuffer`. Keep this — the engine functions are
   framework-agnostic and port verbatim.

6. **`renderMode="static"`** disables animation AND resize observation, uses
   lower backing-resolution caps (`STATIC_DEFAULT_MAX_COLS=320`,
   `STATIC_DEFAULT_MAX_ROWS=200`), and defers initial paint via
   `requestIdleCallback` (with `setTimeout` fallback). Live mode uses
   `DEFAULT_MAX_COLS=960`/`DEFAULT_MAX_ROWS=600` and paints via `setTimeout(0)`.
   Preserve both paths on `DitherGradient`, `DitherButton`, `DitherImage`.

### RAF loop lifecycle (DitherButton, chart canvases, DitherSpinner)

```tsx
// Canonical: effect owns the loop, cleanup cancels it.
const rafRef = useRef(0);
useEffect(() => {
  if (reduce || renderMode === "static") { paint(); return; }
  const tick = () => { /* … */ rafRef.current = requestAnimationFrame(tick); };
  rafRef.current = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafRef.current);
}, [deps]);
```

A `restartToken` ref guards against stale RAF closures firing after a prop
change restarted the loop (the Vue `restartToken` pattern). Keep it for
`DitherButton` and any component that rebuilds its loop on prop change.

---

## 10. Per-component port table

71 SFCs in `dither-kit/`. Grouped by the kit's own `index.ts` sections. Every
row is grounded in the actual SFC contents (script style, constructs used, risk).
Risk: **low** = thin wrapper / pure render; **med** = canvas or state machine;
**high** = gesture engine, multi-canvas, or pervasive RAF.

### Charts + Parts

| File | Vue constructs | React port notes | Risk |
|---|---|---|---|
| `Area.vue` | `<script setup>`; `defineProps`; forwards to `CartesianSeries` via `v-bind="$props"` + default `<slot/>`. | Thin marker — wraps `CartesianSeries` (or inlines it). `v-bind="$props"` → spread props. See §8. | low |
| `Line.vue` | `<script setup>`; `defineProps`; forwards to `CartesianSeries`. | Same as Area, `kind="line"`. | low |
| `Bar.vue` | `<script setup>`; `defineProps`+`withDefaults`; `watch(immediate)` registers series; `onBeforeUnmount` unregisters; `provide(SeriesKey,…)`; `computed` for band/rects; `v-for` rects (transparent hit targets); `@click`. | Config marker + hit `<rect>`s. Register/unregister in ONE effect (§2). `provide` → `SeriesContext value=`. | med |
| `CartesianSeries.vue` | `<script setup>`; `defineProps`+`withDefaults`; `useChartPart`; `watch(immediate)`→`registerSeries`; `onBeforeUnmount`→`unregisterSeries`; `provide(SeriesKey,…)` with getters; `computed` band/hitPath; `@click`. | The shared series host. Getters in the provided value object read `ctx` fresh (works in React — object literal with getters). | med |
| `Pie.vue` | `<script setup>`; `defineProps`; `usePolarPart("Pie","pie")`; `watch(immediate)`→`registerVariant("*",variant)`; `onBeforeUnmount`→`unregisterVariant("*")`; renders `<g/>`. | Pure config marker, renders empty fragment. | low |
| `Radar.vue` | `<script setup>`; `defineProps`; `usePolarPart("Radar","radar")`; DEV warn on missing config key; `watch(immediate)`→`registerVariant`; `onBeforeUnmount`→`unregisterVariant`. | Config marker. | low |
| `RadarFrame.vue` | `<script setup>`; `defineOptions({chartLayer:"back"})`; `usePolarChart`; `computed` rings/axes; `v-for` paths/lines/text. | Layer part. `chartLayer:"back"` → `RadarFrame.chartLayer="back"` static field (§8). | low |
| `Grid.vue` | `<script setup>`; `defineOptions({chartLayer:"back"})`; `withDefaults`; `useChartPart("Grid")`; `v-if` ready; `v-for` lines (h/v). | Layer part, pure SVG. | low |
| `XAxis.vue` | `<script setup>`; `withDefaults`; `useChartPart("XAxis")`; `computed` step; `labelAt`; `v-for` text. | Layer part, pure SVG. | low |
| `YAxis.vue` | `<script setup>`; `withDefaults`; `useChartPart("YAxis")`; `v-for` text. | Layer part, pure SVG. | low |
| `Dot.vue` | `<script setup>`; `withDefaults`; `useChart`+`useSeries`; `computed` band/paint; `v-if` ready; `v-for` circles; inline `:style` opacity transition. | SVG markers inside series slot. | low |
| `ActiveDot.vue` | `<script setup>`; `withDefaults`; `useChart`+`useSeries`; `computed` point (gates on `entranceDone`); `v-if` point. | SVG marker, conditional on hover+entrance. | low |
| `Legend.vue` | `<script setup>`; `defineOptions({chartLayer:"dom"})`; `withDefaults`; `useCommonChart`; `dimmed`; `v-for` buttons; `@click`/`@pointerenter`/`@focus`. | DOM layer. `chartLayer:"dom"` static field. Click/enter/focus handlers. | low |
| `Tooltip.vue` | `<script setup>`; `defineOptions({chartLayer:"dom"})`; `withDefaults`; `useCommonChart`; `computed` show/index/heading/items; `ref` lastIndex; `watch` hoverIndex; `<Transition name="dk-tooltip">`; scoped CSS glide. | DOM layer + CSS transition (§6). `watch`→`useEffect`. Keep CSS glide. | med |
| `Sparkline.vue` | `<script setup>`; `withDefaults`; `computed` rows/config; composes `<AreaChart>`+`<Area>`. | Composition — proves the chart API. | low |

### Standalone

| File | Vue constructs | React port notes | Risk |
|---|---|---|---|
| `DitherButton.vue` | `<script>` (types/paint helpers) + `<script setup>`; `withDefaults`; `computed` color/variant/bloom/cell/effMax; template refs (`buttonRef`,`canvasRef`,`bloomRef`); `onMounted`→`restartRuntime`; `watch(flush:"post")`→`restartRuntime`; `onBeforeUnmount`; RAF deferral (`restartToken`); `willReadFrequently` canvas; `ResizeObserver`; `RasterBuffer`+`putRasterBuffer`; `pixelPrefersReducedMotion`; pointer listeners; precompiled `<img>` fallback; loading dots `<span v-for>`. | **High-risk template.** Port `init()`/`restartRuntime()`/`restartToken` as in §9. Effect owns loop + listeners + RO, cleanup tears all down. Dep array = the watched sources. | high |
| `DitherGradient.vue` | `<script setup>`; `withDefaults`; `computed`; template refs; `onMounted`/`onBeforeUnmount`; `watch`; `ResizeObserver`; `willReadFrequently`; `requestIdleCallback`+`setTimeout` fallback; bloom overlay; precompiled fallback. | Static-vs-live paths (§9). `requestIdleCallback` guarded for SSR. | med |
| `DitherImage.vue` | `<script setup>`; `withDefaults`; `computed`; refs; `onMounted`/`onBeforeUnmount`; `nextTick`; `ResizeObserver`; `willReadFrequently`; precompiled fallback; fade dissolve. | `nextTick`→`useEffect`/`flushSync` (§7). Cover-fit math in engine. | med |
| `DitherAvatar.vue` | `<script setup>`; `defineOptions`; `withDefaults`; `computed`/`ref`/`watch`; `onMounted`/`onBeforeUnmount`; template refs; RAF; `willReadFrequently`; seeded PRNG + pixel matrix + bloom overlay. | Seeded generative (per AGENTS.md). Engine (`avatar-pattern.ts`) ports verbatim. | high |
| `DitherSpinner.vue` | `<script setup>`; `withDefaults`; `computed`/`ref`/`watch`; `onMounted`/`onBeforeUnmount`; `nextTick`; `useCanvasVisibility`; `putRasterBuffer`; RAF; `willReadFrequently`; precompiled fallback; seeded 3-axis param engine. | Generative like charts. `useCanvasVisibility` gating is critical (§9). | high |

### Controls (form fields + selection)

| File | Vue constructs | React port notes | Risk |
|---|---|---|---|
| `DitherInput.vue` | `<script setup>`; `defineOptions({inheritAttrs:false})`; `withDefaults`; `defineEmits` `update:modelValue`; `useField`; `computed` invalid/invalidStyle; `v-bind="$attrs"`; `@input`. | `v-model`→`value`/`onChange` (§4). `inheritAttrs:false`+`$attrs`→rest spread (§5). Field id merge. | low |
| `DitherTextarea.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `computed`; `v-bind($attrs)`; `v-model`. | Same as Input. | low |
| `DitherNumberField.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `computed`/`ref`/`watch`; v-model; keyboard arrows + blur. | Controlled input + +/- buttons. Local text state synced to `value`. | low |
| `DitherOtpField.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `ref`/`watch`; array ref via `v-for ref="inputs"`; keyboard/paste/input. | Array refs → `useRef<(HTMLInputElement|null)[]>` + ref callback (§7). | med |
| `DitherField.vue` | `<script>` (fieldCount) + `<script setup>`; `defineProps`; `provide(FIELD_CONTEXT,…)` via `toRef`; template refs for slot forwarding; `v-if`/`v-else`. | **Foundation dep: `FieldContext` + `useField`** (§3, §12). Provide context wrapping children. ID/help/error wiring. | med |
| `DitherFieldset.vue` | `<script setup>`; `defineProps` (legend); default slot. | Trivial wrapper. | low |
| `DitherForm.vue` | `<script setup>`; `defineEmits` (submit); `@submit.prevent`; default slot. | `onSubmit`+`preventDefault` (§5). | low |
| `DitherSelect.vue` | `<script>` (Option type) + `<script setup>`; `withDefaults`; `defineEmits`; `defineOptions({inheritAttrs:false})`; `computed`/`nextTick`/`onBeforeUnmount`/`onMounted`/`ref`/`watch`; template refs (`rootRef`,`triggerRef`); keyboard nav; document-level outside pointerdown listener; `<Transition>` + scoped styles. | State machine: open/close, activeDescendant, outside dismiss. `useEffect` for document listener with cleanup. | med |
| `DitherCombobox.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `computed`/`ref`/`watch`; v-model on input; `v-if`/`v-for`; keyboard nav; scoped transition styles. | Controlled input + filtered list + keyboard. | med |
| `DitherAutocomplete.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `computed`/`ref`; v-model; keyboard nav; `v-if` dropdown. | Simpler combobox. | med |
| `DitherCheckbox.vue` | `<script>` (paintBox) + `<script setup>`; `withDefaults`; `defineEmits`; `computed`/`ref`/`watch`/`onMounted`; template refs; `willReadFrequently` canvas; `v-show`. | Canvas checkmark dither. `v-show`→`hidden` attr. | med |
| `DitherCheckboxGroup.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `v-for`; default slot. | Thin wrapper, `value: string[]` + `onChange`. | low |
| `DitherRadioGroup.vue` | `<script>` (paintDot) + `<script setup>`; `withDefaults`; `defineEmits`; `computed`/`nextTick`/`onMounted`/`ref`/`watch`; array refs (`:ref` callback); per-option `willReadFrequently` canvas; keyboard nav. | Array refs + per-option canvas. | med |
| `DitherSwitch.vue` | `<script>` (paintTrack) + `<script setup>`; `withDefaults`; `defineEmits`; `computed`/`onMounted`/`ref`/`watch`; canvas dither track; template refs; `<Transition>` on thumb. | Canvas track + CSS thumb transition. | med |
| `DitherToggle.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `computed`/`onBeforeUnmount`/`onMounted`/`ref`/`watch`; `ResizeObserver` + RAF; canvas dither fill; shared `paintToggleCanvas`. | RAF + ResizeObserver + `RasterBuffer`. | med |
| `DitherToggleGroup.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `computed`/`nextTick`/`onBeforeUnmount`/`onMounted`/`ref`/`watch`; array refs (`:ref`); keyboard nav; shared canvas paint. | Array refs + RAF + canvas. | high |
| `DitherSlider.vue` | `<script>` (paintTrack, SliderVariant) + `<script setup>`; `withDefaults`; `defineEmits`; `computed`/`onBeforeUnmount`/`onMounted`/`ref`/`watch`; canvas track; pointer events (down/move/up/cancel); `ResizeObserver`; ranges + ticks. | **Highest-risk control.** Canvas + pointer drag + resize. Consider keeping canvas per AGENTS.md. | high |
| `DitherRating.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `computed`/`onMounted`/`ref`/`watch`; canvas star; hover `ref`; keyboard nav. | Canvas stars + hover preview. | med |
| `DitherMeter.vue` | `<script setup>`; `withDefaults`; `computed`/`onBeforeUnmount`/`onMounted`/`ref`/`watch`; canvas dither track; `ResizeObserver`; zone computed. | Canvas meter + zones. | med |

### Overlays

| File | Vue constructs | React port notes | Risk |
|---|---|---|---|
| `DitherDialog.vue` | `<script setup>`; `withDefaults`; `defineEmits` (close); `nextTick`/`onBeforeUnmount`/`ref`/`watch`; `<Teleport to="body">`; `<Transition name="dk-dialog">`; focus trap (`focusable()`+Tab cycle+Escape+restore focus); scoped styles; named `footer` slot. | `Teleport`→`createPortal` (§6). Focus trap → `useFocusTrap` hook (§7). CSS transition (§6). | med |
| `DitherAlertDialog.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `nextTick`/`onBeforeUnmount`/`ref`/`watch`; `<Teleport>`; focus trap; `<Transition>`; scoped styles. | Same as Dialog + alert semantics. | med |
| `DitherPopover.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `onBeforeUnmount`/`ref`/`watch`; template refs; outside pointer dismiss; Escape; `<Transition>` + scoped. | State + document listener effect. | low |
| `DitherTooltip.vue` | `<script setup>`; `withDefaults`; `onBeforeUnmount`/`ref`; `setTimeout` show delay; hover/focus; `<Transition>` + scoped. | Timers in effect with cleanup. | low |
| `DitherMenu.vue` | `<script>` (MenuItem) + `<script setup>`; `withDefaults`; `defineEmits`; `onBeforeUnmount`/`ref`/`watch`; array refs (`itemRefs`); outside dismiss; keyboard nav; `<Transition>` + scoped. | Array refs + state machine. | med |
| `DitherMenubar.vue` | `<script>` (types) + `<script setup>`; `withDefaults`; `defineEmits`; `onBeforeUnmount`/`ref`/`watch`; two-level refs (`topRefs`,`itemRefs`); L/R + U/D keyboard; hover-to-switch; `<Transition>` + scoped. | Nested menu state machine. | med |
| `DitherContextMenu.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `nextTick`/`onBeforeUnmount`/`ref`/`watch`; `<Teleport to="body">`; `contextmenu` event + clamping; array refs; keyboard nav. | Portal + position clamping. | med |
| `DitherDrawer.vue` | `<script>` (DrawerSide, DrawerChannel, resolveSnap) + `<script setup>`; `withDefaults`; `defineEmits`; `provide`/`inject` (`DRAWER_CHANNEL`); `computed`/`nextTick`/`onBeforeUnmount`/`onMounted`/`ref`/`watch`; `<Teleport>`; gesture system (`rubberband`/`velocityFrom`/`project` from `gesture.ts`); swipe-to-dismiss + snap points; `<Transition>`s. | **Highest-risk component.** Gesture engine (foundation ports `gesture.ts` verbatim) + portal + nested channel context + snap points. | high |
| `DitherDrawerIndent.vue` | `<script setup>`; `defineProps`; `provide` (`DRAWER_CHANNEL` app-level, openCount). | Thin provider → `<DrawerChannelProvider>`. | low |
| `DitherSwipeArea.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `onBeforeUnmount`/`onMounted`/`ref`; pointer events + `setPointerCapture`; swipe threshold. | Edge trigger, pointer listeners in effect. | low |
| `DitherPreviewCard.vue` | `<script setup>`; `withDefaults`; `ref`/`onBeforeUnmount`; `<Transition>`; scoped styles; hover/focus delays. | Timers + CSS transition. | med |
| `DitherScrollArea.vue` | `<script setup>`; `defineProps`; default slot; scoped CSS for custom scrollbars. | Pure CSS wrapper → CSS Module. | low |
| `DitherCollapsible.vue` | `<script>` (paintRail) + `<script setup>`; `withDefaults`; `defineEmits`; `onBeforeUnmount`/`onMounted`/`ref`/`watch`; canvas rail; `ResizeObserver`; `inert` attr; grid-row transition. | Canvas rail + CSS grid-row expand. `inert` attr works in React. | med |
| `DitherToaster.vue` | `<script setup>`; `withDefaults` (setRail); `onBeforeUnmount`/`onMounted`/`ref`/`watch`; `<Teleport>`; reactive `toasts[]` store; `<TransitionGroup>`; canvas dither rail per toast. | **Foundation dep: toast store** (§3, §12). `<TransitionGroup>`→`react-transition-group` or FLIP hook (§6). | med |

### Navigation

| File | Vue constructs | React port notes | Risk |
|---|---|---|---|
| `DitherBreadcrumb.vue` | `<script setup>`; `withDefaults`; `v-for`; `v-if`/`v-else`; `Crumb` type. | Static list render. | low |
| `DitherPagination.vue` | `<script setup>`; `withDefaults`; `defineEmits`; v-model; `computed`; `v-for`; `v-if`/`v-else`; `pageList` export. | `pageList` helper ports verbatim. `value`/`onChange`. | low |
| `DitherNavMenu.vue` | `<script setup>`; `withDefaults`; `defineEmits`; v-model; array refs; `nextTick`/`ResizeObserver`/`willReadFrequently` canvas; animated dither underline. | Canvas underline + array refs. | med |
| `DitherSidebar.vue` | `<script setup>`; `withDefaults`; `defineEmits`; v-model; `computed`; `provide` (SIDEBAR_COLLAPSED, SIDEBAR_COMPACT). | **Foundation dep: `SidebarContext`** (§3). | med |
| `DitherSidebarGroup.vue` | `<script setup>`; `withDefaults`; `inject` (SIDEBAR_COLLAPSED); `v-if`/`v-else`. | Consumes sidebar context. | low |
| `DitherSidebarItem.vue` | `<script setup>`; `withDefaults`; `defineEmits`; `inject`; `ref`/`watch`/`onMounted`; `willReadFrequently` canvas; active rail. | Canvas rail + context. | med |
| `DitherSidebarSub.vue` | `<script setup>`; `withDefaults`; `defineEmits`; v-model; `inject`; `v-if`/`v-else`. | Expandable sub-menu + context. | med |
| `DitherTabs.vue` | `<script setup>`; `withDefaults`; `defineEmits`; v-model; `provide`/`inject` (TABS_CTX); `computed`/`ref`/`watch`/`onMounted`/`onBeforeUnmount`/`nextTick`; `ResizeObserver`/`willReadFrequently` canvas; keyboard nav. | **Foundation dep: `TabsContext`**. Canvas marker + keyboard. | high |
| `DitherTabPanel.vue` | `<script setup>`; `withDefaults`; `inject` (TABS_CTX); `computed`; `v-show`. | Consumes tabs context; `v-show`→`hidden`. | low |

### Feedback

| File | Vue constructs | React port notes | Risk |
|---|---|---|---|
| `DitherBadge.vue` | `<script setup>`; `withDefaults`; `computed`/`ref`/`watch`; `ResizeObserver`/`willReadFrequently` canvas; 4 variants. | Canvas texture badge. | med |
| `DitherSkeleton.vue` | `<script setup>`; `withDefaults`; `ref`/`onMounted`/`onBeforeUnmount`; `useCanvasVisibility`; RAF; `willReadFrequently` canvas; shimmer. | Visibility-gated RAF shimmer (§9). | med |
| `DitherSpinner.vue` | (see Standalone) | generative, high-risk. | high |
| `DitherSeparator.vue` | `<script setup>`; `withDefaults`; `ref`/`watch`/`onMounted`/`onBeforeUnmount`; `ResizeObserver`/`willReadFrequently` canvas; h/v dither rule. | Canvas rule. | med |
| `DitherProgress.vue` | `<script setup>`; `withDefaults`; `computed`/`ref`/`watch`/`onMounted`/`onBeforeUnmount`; `useCanvasVisibility`/`ResizeObserver`/`willReadFrequently` canvas; determinate + indeterminate dither band. | Visibility-gated canvas. | med |

### Structure

| File | Vue constructs | React port notes | Risk |
|---|---|---|---|
| `DitherAccordion.vue` | `<script setup>`; `withDefaults`; `defineEmits`; v-model; template refs (array); `ResizeObserver`/RAF; single/multiple expand. | Controlled accordion, array refs. | med |
| `DitherKbd.vue` | `<script setup>`; `withDefaults`; (trivial). | Pure render (§1 example). | low |
| `DitherStepper.vue` | `<script>` (Step type) + `<script setup>`; `withDefaults`; `v-for`; `v-if` (SVG done icon). | Pure render, `steps`/`current` props. | low |
| `DitherTimeline.vue` | `<script setup>`; `withDefaults`; template refs (array); `onMounted`; `willReadFrequently` canvas; `TimelineItem` type. | Canvas dots + array refs. | med |
| `DitherToolbar.vue` | `<script setup>`; `withDefaults`; `ref`/`onMounted`; `v-for`; arrow-key nav with `tabIndex` mgmt; no canvas. | Roving tabindex, pure DOM. | low |

**SFC count: 71.** All inspected: 17 read directly in this session
(CartesianSeries, Area, Bar, Line, ActiveDot, Dot, Grid, XAxis, YAxis, Legend,
Tooltip, Pie, Radar, RadarFrame, Sparkline, DitherButton, DitherInput,
DitherDialog) + 54 via scout subagents (DitherCheckbox through DitherToolbar) +
chart engine files (chart-context, cartesian-root, polar-root, polar-context,
series-context, common-context, use-chart-dimensions, use-visibility, control,
lib, index). No SFC was guessed.

---

## 11. App port outline (src FSD → Next.js App Router)

The Vue app is a hash router in `app/App.vue` resolving three routes (landing,
docs, studio). Next.js 15 App Router replaces this with filesystem routes. The
FSD layering (pages → widgets → features → entities → shared) maps to a
`dither-next/src/` tree keeping the same slice boundaries; only the top-level
`app/` and routing change shape.

### Route mapping

| Vue (hash router) | Next.js App Router | Notes |
|---|---|---|
| `/#/` landing | `app/page.tsx` | Server Component shell; landing sections are client (canvas, reveal). |
| `/#/docs` + `/#/docs/<section>` | `app/docs/page.tsx` + `app/docs/[section]/page.tsx` | Dynamic segment. Scroll-spy via `useSearchParams`/`usePathname`. |
| `/#/studio` + `/#/studio#new/<type>` | `app/studio/page.tsx` (client) | Deep-link `#new/<type>` read from `useSearchParams` or hash. |
| legacy `#/docs/<section>` | redirect/rewrite to `/docs/<section>` | see below |
| legacy `#/studio/new/<type>` | handle in `app/studio/page.tsx` | see below |

### Canonical vs legacy hash link support

`src/app/App.vue` migrates legacy hash links in place on load:
`/#/docs/avatar` → `/docs/avatar` via `history.replaceState`, and
`/#/studio/new/pie` → `/studio#new/pie`. In Next.js:

- **Canonical routes are the App Router paths** (`/docs/[section]`, `/studio`).
  Route entry HTML files (`app/docs/[section]/page.tsx`) own crawler-visible
  `metadata` exports.
- **Legacy hash links** (`#/docs/<id>`, `#/studio/new/<type>`) MUST remain
  shareable. Two options:
  1. A `middleware.ts` that 308-redirects `/#/docs/avatar` → `/docs/avatar`
     (middleware can't see the hash — hash is client-only, so this only works
     for path-style legacy, not true hash). **Therefore:** handle legacy hash
     in a client component at the route root that reads `window.location.hash`
     on mount and `router.replace()`s to the canonical path.
  2. Keep a client `<LegacyHashRedirect>` component mounted in
     `app/layout.tsx` that runs once on mount: if `location.hash` matches
     `#/docs/...` or `#/studio/new/...`, `router.replace()` to canonical and
     stop. This mirrors the Vue `replaceState` behavior.
- **Studio deep links** (`/studio#new/pie` and legacy `#/studio/new/pie`) are
  read in `app/studio/page.tsx`'s client boot: `useEffect` on mount reads
  `location.hash`, if `new/<type>` matches `CHART_TYPES`, calls
  `addArtboard(type)`, then `history.replaceState` to clean the URL to
  `/studio`. This must run AFTER `hydrate()` + `startHistory()` so the added
  artboard is part of the restored doc and undoable — same boot order as
  `StudioPage.vue`.

### `shared/lib/routes.ts` → base path helpers

The Vue app uses `routePath()` / `assetPath()` / `appPathname()` from
`shared/lib/routes.ts` so one build works at `/` and at GitHub Pages project base
(`/dither-ui/`). In Next.js:

- `next.config.ts` `basePath` + `assetPrefix` handle this at the framework
  level. Set `basePath: process.env.NEXT_BASE_PATH || ""` for project-URL deploys.
- `routePath("/docs")` → `basePath + "/docs"`; replace call sites with
  `next/link` `<Link href="/docs">` (Next prefixes `basePath` automatically).
- `assetPath("/faces.webp")` → just `/faces.webp` with `basePath` configured, or
  `next/image` with the asset in `public/`.
- The `dither-next/src/shared/lib/` port can keep a thin `routePath`/`assetPath`
  shim for non-`next/link` usages, backed by `process.env.NEXT_BASE_PATH`.

### FSD slice port list

Each slice keeps its directory under `dither-next/src/`; the layering
(pages → widgets → features → entities → shared) is preserved. `@dither-kit`
alias points at `dither-next/dither-kit/`.

| Slice | Vue shape | Next.js port notes |
|---|---|---|
| `app/` | `App.vue` (router), `styles.css` (tokens), `PageLoader.vue` | `app/layout.tsx` (root layout, tokens in `globals.css`), `app/page.tsx`, `app/docs/`, `app/studio/`. `PageLoader`→`next/dynamic` `loading`. `useTheme`→client provider. |
| `pages/landing/` | `LandingPage.vue` (Japanese-minimal, reveal stagger, emote hover, sprite crops) | `app/page.tsx` + client sections. CSS-only reveal (`.reveal` stagger), `prefers-reduced-motion`. Sprite crops use measured constants — port `FACES`/`FACE_Y`/`FACE_H` verbatim. No JS timers on landing. |
| `pages/docs/` | `DocsPage.vue`, `DemoCard.vue`, `PropsTable.vue`, `components/`, `examples/` (section packs + `*-nav.ts`) | `app/docs/page.tsx` + `app/docs/[section]/page.tsx`. Scroll-spy via `IntersectionObserver` (rootMargin -56px). `DemoCard` Preview/Code tabs → client component. Section packs keep the self-contained shape (section + snippets + local state + `*-nav.ts`). Wayfinding: clean + legacy deep links both restore. |
| `pages/studio/` | `StudioPage.vue` (boot order, desktop gate, panels) | `app/studio/page.tsx` (**client**). See Studio section below — highest risk. |
| `widgets/canvas/` | `Canvas.vue`, `Artboard.vue` (infinite pan/zoom, multi-artboard, drag/resize/duplicate/group/lock/hide) | Client widgets. Pan-zoom + artboard-transform features feed these. |
| `widgets/layer-tree/` | `LayerTree.vue` (listbox, role=option, aria-selected, ↑↓ stopPropagation) | Client. Keyboard contract MUST stopPropagation on ↑/↓ (window-level nudge conflict). |
| `widgets/inspector/` | `Inspector.vue`, `ComponentPropsPanel.vue`, `AvatarDrawGrid.vue` | Client. Full granularity UI. `shared/ui` ColorField/BezierEditor/TextureField feed it. |
| `widgets/toolbar/` | `Toolbar.vue` (contextual hierarchy, project/insertion/global) | Client. `v-model:layers-open`/`v-model:inspector-open` → props + callbacks. |
| `widgets/data-editor/` | `DataEditor.vue` (spreadsheet drawer per chart) | Client. |
| `widgets/chart-renderer/` | `ChartRenderer.vue` | Client — consumes `@dither-kit` charts. |
| `widgets/widget-renderer/` | `WidgetRenderer.vue`, `ScreenRenderer.vue` | Client — renders registry components + composed screens. |
| `features/pan-zoom/` | wheel pan, ⌘-wheel zoom, ⇧1 fit | Client hook + state in editor store. |
| `features/artboard-transform/` | `startDrag` (pointer-id filter, owns pointer-up/cancel/unmount cleanup) | Client. Non-interactive regions only drag. |
| `features/keyboard/` | `useShortcuts.ts`, `ShortcutsHelp.vue` | Client. Window-level listeners; every shortcut row in `ShortcutsHelp`. |
| `features/history/` | `history.ts` (snapshot undo/redo, 300ms coalesce, `startHistory`/`stopHistory` singletons) | See Studio history below. |
| `features/persistence/` | `persist.ts` (localStorage hydrate/autosave, project list, import/export `.json`) | See Studio persistence below. |
| `features/export-code/` | `ExportDialog.vue` (lazy) + codegen | Client. Codegen mirrors `entities/widget/model/codegen.ts`. |
| `features/export-image/` | image export | Client. |
| `features/presets/` | preset library | Client. |
| `entities/editor/` | `store.ts` (`reactive` editor singleton, `Viewport`, `Group`, selection, clipboard, `placeArtboard`) | **Editor store** — see below. |
| `entities/chart/` | `codegen.ts`, `csv.ts`, `data.ts`, `derive.ts`, `factory.ts`, `layers.ts`, `rows.ts`, `types.ts` | Pure TS — port verbatim. |
| `entities/artboard/` | `factory.ts`, `normalize.ts`, `types.ts` | Pure TS — port verbatim. |
| `entities/widget/` | `registry.ts`, `codegen.ts`, `factory.ts`, `screen.ts`, `types.ts` | Pure TS — port verbatim. `registry.ts` is the Studio library source of truth. |
| `shared/ui/` | `Segmented`, `NumberField`, `ColorField`, `CodeBlock`, `ContextMenu`, `BezierEditor`, `BloomField`, `TextureField`, `Toggle` | Client UI primitives consumed by inspector + docs. Port each (small Vue SFCs). |
| `shared/config/` | `CHART_TYPES`, `EASING_NAMES`, `VARIANTS`, `BLOOMS`, `STACKS`, `DIRECTIONS`, `COLORS`, `familyOf` | Pure TS — port verbatim. |
| `shared/lib/` | `routes.ts`, `useTheme.ts` | `routes.ts`→thin shim over `basePath`; `useTheme`→client context. |

### Editor store: `reactive` singleton → `useSyncExternalStore`

The Vue `editor` is a module-level `reactive({...})` singleton mutated by
exported functions (`selectArtboard`, `addArtboard`, `moveSelected`, etc.).
Components read via `computed` getters. This is a **global mutable store** —
the canonical React port is `useSyncExternalStore`:

```tsx
// dither-next/src/entities/editor/model/store.ts
type EditorState = { artboards: Artboard[]; groups: Group[]; selectedIds: string[]; selectedArtboardId: string; selectedLayerId: string; viewport: Viewport; replayToken: number; dataOpen: boolean; guides: { v: number | null; h: number | null } };

let state: EditorState = makeInitialState();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
export function getEditorSnapshot() { return state; }

// every mutation replaces `state` with a new object and calls emit()
export function selectArtboard(id: string, additive = false) {
  state = { ...state, selectedArtboardId: id, selectedIds: /* … */ };
  emit();
}

// in a component:
export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}
```

**Key decisions:**

- Module-level singleton (not React Context) — matches Vue's module `reactive`
  and keeps history/persistence working as pure functions of the snapshot.
- Mutations MUST produce a new top-level object (immutable update) so
  `useSyncExternalStore` detects the change. Nested artboard mutations copy on
  write.
- History snapshots `{artboards, groups}` (excludes viewport + selection
  deliberately) — keep that. `snap()` → `JSON.stringify({artboards: state.artboards, groups: state.groups})`.
- `placeArtboard` centers inserts in the current viewport — keep verbatim.
- Deep watcher for history (`watch(() => editor, …, {deep:true})`) → a
  `subscribe` in `startHistory` that pushes a debounced (300ms) snapshot on
  every emit. `muted` flag swallows the restore echo.

### Studio — highest-risk area (subtasks)

The Studio editor is the single highest-risk port. Break it into these subtasks
(each a backlog task):

1. **Editor store** — `reactive` singleton → `useSyncExternalStore`
   (`entities/editor/model/store.ts`). All mutations, selection, clipboard,
   `placeArtboard`, `replay`. Gate: every component reads via `useEditor(selector)`.
2. **History** — `features/history/history.ts`. Snapshot undo/redo, 300ms
   coalesce, `startHistory`/`stopHistory` as singletons bound to the studio
   route mount. Deep-watch → `subscribe` + debounce. `muted` restore-echo guard.
3. **Persistence** — `features/persistence/persist.ts`. localStorage hydrate
   (run before first paint), autosave (debounced watcher → `subscribe`),
   project list (create/switch/rename/delete), `.json` import/export,
   `validDoc` envelope sanitization for untrusted imports. `flushSave`.
   **`hydrate()` MUST run before `startHistory()`** so the restored doc is the
   baseline.
4. **Pan-zoom** — `features/pan-zoom`. Wheel pan, ⌘-wheel zoom, ⇧1 fit. State
   lives in editor viewport; interactions are canvas-level pointer/wheel
   listeners.
5. **Artboard-transform** — `features/artboard-transform/startDrag`. Pointer-id
   filter, owns pointer-up/cancel/unmount cleanup. Non-interactive regions only
   drag (live controls retain pointer ownership). Move/nudge/duplicate/delete/
   lock/group act on complete selection; locked members stay put.
6. **Keyboard** — `features/keyboard/useShortcuts`. Window listeners; every
   shortcut also a row in `ShortcutsHelp`. ↑/↓ nudge at window level; LayerTree
   stops propagation for the same keys. Escape closes panels/dialogs.
7. **Export-code** — `features/export-code`. `ExportDialog` (lazy via
   `next/dynamic`). Codegen mirrors `entities/widget/model/codegen.ts` —
   produces a runnable `.tsx` per artboard reflecting every setting. Sanitization
   of untrusted props via `sanitizeComponentProps`.
8. **Canvas widget** — `widgets/canvas`. Infinite canvas, multi-artboard,
   drag/resize/duplicate(⌘D)/group(⌘G)/lock(⌘L)/hide/delete. Snap guides
   (transient, `state.guides`, never persisted).
9. **Layer tree widget** — listbox a11y contract (role=option, aria-selected,
   Enter/Space select `.self`-guarded, ↑↓ move focus + stopPropagation, rename
   inputs don't retrigger).
10. **Inspector + data-editor** — full granularity; data-editor spreadsheet
    drawer per chart (edit any cell, add/remove rows+series; pie rows are slices
    synced with series).
11. **Studio boot** — `app/studio/page.tsx` client page. Boot order:
    `hydrate()` → `startAutosave()` → `startHistory()` → deep-link handling
    (`/studio#new/<type>` or legacy `#/studio/new/<type>`) → `replaceState`
    clean. Desktop gate (`window.innerWidth >= 1024`). On unmount: `stopAutosave`
    + `stopHistory`. Route revisits must NOT accumulate subscriptions (singleton
    handles). `ShortcutsHelp` + lazy `ExportDialog` mount on the page, not in
    widgets.

### `app/App.vue` → `app/layout.tsx`

- `watchEffect` setting `document.title` per route → Next.js `metadata` exports
  per route (static or generated). Studio/docs/landing each export `metadata`.
- Hash router listeners (`hashchange`/`popstate`) → gone; App Router handles
  navigation. Legacy hash handled by the `<LegacyHashRedirect>` client
  component (above).
- `defineAsyncComponent` for Docs/Studio → `next/dynamic` with `ssr: false` for
  Studio (it's canvas-heavy and client-only); Docs can SSR its shell.

### `app/styles.css` → `app/globals.css`

Port the shadcn-style CSS var tokens (background, foreground, card, popover,
border, accent, muted-foreground, ring) verbatim into `globals.css`. The
foundation worker owns this. `:focus-visible` global ring MUST NOT be suppressed.
Tailwind v4 `@theme` block references these vars so kit class strings resolve.

---

## 12. Foundation dependencies

The foundation worker is porting the framework-agnostic engine + the React
context/hook scaffolding before component workers start. Component workers
BLOCK on these. If a context hook is missing, STOP and message the foundation
worker via the hub rather than reinventing it.

**Engine files (pure TS, port verbatim — no Vue):** `palette.ts`, `pixel.ts`,
`dither-paint.ts`, `precompile.ts`, `raster.ts`, `scales.ts`, `polar.ts`,
`dot-paint.ts`, `avatar-pattern.ts`, `gesture.ts`, `toast.ts` (the reactive
store shape becomes a plain module + `useSyncExternalStore` adapter),
`lib.ts` (`cn`).

**React context/hooks the foundation worker owns (names component workers use):**

Foundation scope = the framework-agnostic engine + the React context/hook scaffolding for the chart system, fields, and toasts. The editor store, Sidebar, Tabs, and DrawerChannel contexts are NOT foundation scope — the component-group and app workers own those (see below). If a chart/field/toast context hook is missing, STOP and message the foundation worker via the hub rather than reinventing it.

| Foundation export | Consumed by | Status |
|---|---|---|
| `ChartContext`, `useChart`, `useChartPart`, `useChartController`, types | all chart roots + parts | shipped |
| `PolarChartContext`, `usePolarChart`, `usePolarPart`, `usePolarController` | PieChart, RadarChart, Pie, Radar, RadarFrame | porting |
| `CommonChartContext`, `useCommonChart` | Legend, Tooltip | shipped |
| `SeriesContext`, `useSeries` | CartesianSeries, Area, Line, Bar, Dot, ActiveDot | shipped |
| `FieldContext`, `useField` (from `control.ts`) | DitherField + all field controls | shipped |
| `useChartDimensions<T>()` → `{ el: RefObject<T\|null>, size }` (ref object used as `ref={el}`, ResizeObserver in useEffect) | chart roots | shipped |
| `useCanvasVisibility(el, onWake)` → `() => boolean` (ref-based, no re-render on transition) | DitherSpinner, DitherProgress, DitherSkeleton | shipped |
| `toast()`, `useToast`/`useToasts` (module store + `useSyncExternalStore`, no zustand) | DitherToaster + any `toast()` caller | shipped |
| chart canvas loops (`startXxxLoop` + React wrappers, verbatim from Vue) | cartesian/bar/pie/radar canvases | shipped |

**Controller port notes (confirmed by foundation worker):** `useChartController(input: ControllerInput)` is a React hook returning `ChartContextValue`. `ControllerInput` keeps the getter-facade shape (all `() => T` getters) so deps flow through `useMemo`. Internal state: `useRef` for the mutation boxes the RAF loop reads (hoverIndex, cursorX, isMouseInChart, selectedDataKey, focusDataKey, seriesSpecs), `useState` where a re-render is needed, `useCallback` for stable setters, `useMemo` for derived values (configKeys/bands/scales/common). `markRaw` is dropped — React doesn't need it. This matches §8 point 4.

**Contexts NOT in foundation scope (component-group / app workers own these):**

| Context + hook | Owner workstream | Consumed by |
|---|---|---|
| `SidebarContext` / `useSidebar` | Structure group task | DitherSidebar + Group/Item/Sub |
| `TabsContext` / `useTabs` | Structure group task | DitherTabs + TabPanel |
| `DrawerChannelContext` / `useDrawerChannel` | Overlays group task | DitherDrawer + DrawerIndent |
| Editor store (`useSyncExternalStore` + `useEditor(selector)`) | Studio app task (subtask 1) | all studio widgets/features |

**Cross-cutting helpers (NEW — component workers extract these as needed):**

| Helper | First needed by | Notes |
|---|---|---|
| `useFocusTrap(ref, active)` | DitherDialog | extracted from the Vue focus-trap logic; reuse in AlertDialog. No `react-focus-lock` dep. |
| `usePresence(show, durationMs)` | DitherDialog | for mount/unmount CSS transitions (Dialog, Drawer, Popover, Tooltip, PreviewCard). Prefer over `react-transition-group`. |
| `createPortal` SSR guard | DitherDialog | `typeof document !== "undefined"` check; components are already `"use client"`. |

**No new runtime dependencies** beyond what the foundation scaffold already
provides (React 19, Next 15, Tailwind v4, clsx, tailwind-merge, d3-scale,
d3-shape). If a component worker believes a dep is unavoidable (e.g.
`react-transition-group` for `DitherToaster`'s `<TransitionGroup>`), flag it in
the PR and prefer the local `usePresence`/FLIP hook first.
