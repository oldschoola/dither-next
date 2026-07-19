# dither-next — the React/Next.js port

## Purpose

Parallel Next.js port of the Vue 3 `dither-kit` + `src` app. Lives alongside
the Vue app (which stays the source of truth) and does NOT touch it. The
engine layer is ported verbatim from `../dither-kit`; all 71 kit components
and all three app routes (landing, docs, studio) are ported.

## Ownership

- `dither-kit/` — the React kit: framework-agnostic TS (copied verbatim
  from the Vue kit) + Vue-reactivity→React conversions (contexts, hooks,
  controllers, roots, canvas wrappers). Owns its own `package.json` with
  peerDeps (react, d3-scale, d3-shape, clsx, tailwind-merge) so it stays
  copy-out portable, mirroring the Vue kit's promise. 71 components (+ chart
    infrastructure) +
  engine ported.
- `app/` — Next.js App Router routes: `layout.tsx` (root shell +
  `AppProviders`), `page.tsx` (landing), `docs/` (section SSG +
  `generateStaticParams`), `studio/` (client studio).
- `src/` — the app in FSD: `views/{landing,docs,studio}` (uses `views/`
  not `pages/` — Next.js reserves `src/pages/` for the Pages Router),
  `shared/`, `entities/`, `features/`, `widgets/`.
- `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs` —
  the scaffold.

## Local Contracts

- Stack: Next.js 15 (App Router), React 19, TypeScript strict, Tailwind v4
  (via `@tailwindcss/postcss`), d3-scale, d3-shape, clsx, tailwind-merge.
- Aliases: `@/*` → `./src/*`, `@dither-kit` → `./dither-kit/index.ts`,
  `@dither-kit/*` → `./dither-kit/*` (tsconfig paths).
- Scripts: `dev` (next dev), `build` (next build), `start`, `lint`,
  `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:watch` (`vitest`).
- `html-to-image` is a declared dep (studio PNG export); only reached on user
  action, no bundle bloat for non-studio routes.
- Tests: Vitest + @testing-library/react + jsdom, mirroring the Vue tree's
  20-spec suite. `vitest.config.ts` sets `environment: 'jsdom'`, the
  `@`/`@dither-kit` aliases, and `tests/setup.ts` (RTL cleanup + jest-dom +
  jsdom shims for ResizeObserver/IntersectionObserver/matchMedia/localStorage/
  PointerEvent/offsetParent — jsdom 25 lacks these). Specs live under
  `tests/` (root: engine + models) and `tests/components/` (RTL component
  specs). Pure-function specs import from `@dither-kit`/`@/entities`;
  component specs mount the ported `.tsx` via RTL. The editor store is
  immutable (`useSyncExternalStore`) — seed via `restoreDoc`/`setViewport`,
  read via `getEditorSnapshot()`.
- The kit dir has ZERO imports from `next/` or `../src/` — it must stay
  portable. `'use client'` directives are at the top of every file that uses
  React hooks/context (required by App Router for createContext/useRef/etc).
- Vue→React conversion rules (canonical names, documented in
  `../CONVERSION-GUIDE.md`):
  - `InjectionKey` → React `Context<T | null>`; `inject`/`useXxx` →
    `useContext` with the same boundary-guard errors.
  - `useChartController`/`usePolarController` are React hooks returning the
    context value; `ControllerInput` keeps the getter-facade shape (getters
    preserve `useMemo` dep-tracking). `markRaw` dropped (React doesn't need it).
  - `useChartDimensions<T>()` → `{ el: RefObject<T|null>, size }` (ref object,
    not a callback, so roots read `el.current` in pointer handlers).
  - `useCanvasVisibility(el, onWake)` → `() => boolean` reading a ref (no
    re-render on visibility transition; the RAF loop owns timing).
  - Series/variant registration is imperative state (ref + bump counter) so
    child parts register/unregister in effects without re-rendering the root.
  - `toast()` imperative API preserved; store is module-level emitter +
    `useSyncExternalStore` (no zustand).
  - Canvas RAF loops (`startXxxLoop`) are framework-agnostic and ported
    verbatim — they read state through `Box<T> = { readonly current: T }`.
    The React component wrappers own refs + lifecycle (mount/resize/visibility/
    teardown) via `useEffect` and wake the loop on context-field changes.
  - Chart layer routing: `defineCartesianChart`/`definePolarChart` factories
    return React components; slotted children route to back-canvas / front-svg
    / DOM layers by a static `chartLayer` property on the child's component.
- `precompile.ts` stays browser/SSR-safe (no DOM, no Vue, no server image
  encoder) — same contract as the Vue kit.
- SSR safety: `"use client"` components are still server-rendered during
  prerender, so render-path (module top-level, `useMemo`, or the render body
  before any `useInDom` early-return) MUST NOT touch `window`/`document`/
  `matchMedia`/`localStorage`/`IntersectionObserver`/`ResizeObserver`. Guard
  with `typeof window !== "undefined"` or move the access into a `useEffect`.
  Overlay portals gate on `useInDom()` (false on server) before
  `createPortal(..., document.body)`.
- The public barrel (`dither-kit/index.ts`) exports all ported symbols. Never
  export stubs.

## Verification

- `cd dither-next && npx tsc --noEmit` green.
- `cd dither-next && npm run test` — all 20 ported spec files pass (142 tests).
- `cd dither-next && npm run build` succeeds.
- The Vue app (`../dither-kit`, `../src`) is untouched by this workstream.

## Child DOX Index

- none — `dither-kit/` and `src/` are flat by design (no `AGENTS.md` in
  either yet). If either grows its own contracts, add a child doc here.
