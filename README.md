# dither-next

A **Next.js 15 / React 19** port of [dither-ui](https://github.com/oldschoola/dither-ui-nextjs) — a dithered UI toolkit built on one tiny ordered-dither (Bayer 4×4) canvas engine. Composable **area, line, bar, pie, and radar** charts, generative **avatars**, **buttons**, **gradient washes**, a **FaultyTerminal** CRT glyph wall, and a full Figma-style **Studio** editor. Charts inspired by [Evil Charts](https://evilcharts.com).

The kit lives in `dither-kit/` with no imports from the app — copy-out portable (shadcn-style). Runtime dependencies: React, `d3-scale`, `d3-shape`, `clsx`, `tailwind-merge`.

## Surfaces

- **Landing** (`/`) — marketing page
- **Docs** (`/docs` and `/docs/[section]`) — one long scrollable page with all 76 sections, interactive playgrounds, example blocks, scroll-spy sidebar, and deep-link support
- **Studio** (`/studio`) — a multi-artboard design-tool editor for every component in the kit

```bash
npm install
npm run dev        # http://localhost:3000
npm run test       # 147 tests (vitest + @testing-library/react + jsdom)
npm run build      # next build (82 static pages)
npm run lint       # next lint
npm run typecheck  # tsc --noEmit
```

## Studio

A full design-tool editor for every component in the kit:

- **Canvas** — infinite pan/zoom, multiple artboards: drag, resize, duplicate, group, lock, hide, delete.
- **Layer tree** — frames expand to their chart layers; visibility/lock toggles, context menus, inline rename, keyboard operable.
- **Inspector — full granularity.** Charts: type, per-series colour (presets + HSV/hex picker), texture (preset variants or custom ramp/density/gaps/hatch/off-tier/edge), bloom, easing (draggable cubic-bézier curve editor with overshoot), animation time/delay/stagger/sparkles/hover-lift, dither pixel size, margins, axes/grid/legend/tooltip, per-series opacity + dot markers, per-type geometry (bar gap/edge, pie start angle/pop/rim, radar rings/falloff).
- **Widget builders** — avatar, button, gradient, faulty terminal — each with full parameter control.
- **Data editor** — a spreadsheet drawer per chart: edit any cell, add/remove rows and series; pie rows are slices.
- **Code export** — a runnable React/TSX component per artboard reflecting every setting.
- **Projects** — autosave to localStorage, save/open `.json` project files, undo/redo, shortcuts overlay.

## Architecture (Feature-Sliced Design)

```
dither-kit/   the component library (@dither-kit) — 71 components + chart infrastructure
app/          Next.js App Router routes
  layout.tsx        root shell + AppProviders
  page.tsx          landing
  docs/             docs (SSG + generateStaticParams, 76 section paths)
  studio/           client studio
src/
  views/      landing, docs, studio (views/ not pages/ — Next.js reserves src/pages/)
  widgets/    canvas, layer-tree, inspector, toolbar, data-editor, widget-renderer
  features/   artboard-transform, export-code, keyboard, history, persistence
  entities/   artboard, widget, screen, component-registry
  shared/     ui, lib, model
tests/        vitest specs (engine, models, editor, components) — 147 tests
```

### Aliases

- `@/*` → `./src/*`
- `@dither-kit` → `./dither-kit/index.ts`
- `@dither-kit/*` → `./dither-kit/*`

## Stack

- **Next.js 15** (App Router, SSG)
- **React 19**
- **TypeScript** (strict)
- **Tailwind v4** (via `@tailwindcss/postcss`)
- **d3-scale / d3-shape** for chart scales and shapes
- **Vitest** + `@testing-library/react` + jsdom for tests

## Provenance

This is a faithful port of the Vue 3 [`dither-ui`](https://github.com/oldschoola/dither-ui-nextjs) project. The engine layer (`dither-kit/*.ts` — dither-paint, palette, polar, scales, precompile, raster, avatar-pattern) is copied verbatim from the Vue kit; all `.vue` SFCs were rewritten as `.tsx` function components with React Context + hooks replacing Vue's `provide`/`inject` and reactivity primitives. See `CONVERSION-GUIDE.md` for the full Vue→React mapping.

## License

MIT
