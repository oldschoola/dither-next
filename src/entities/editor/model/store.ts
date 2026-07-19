"use client";

import { useSyncExternalStore } from "react";
import { type Artboard, type ArtboardKind, cloneArtboard, createArtboard } from "@/entities/artboard";
import { type ComponentEntry, createComponent, createScreen } from "@/entities/widget";
import { type Layer, layersOf, setChartType } from "@/entities/chart";
import type { ChartType } from "@/shared/config";

/**
 * Editor store — the Studio canvas state.
 *
 * Port of `src/entities/editor/model/store.ts` per CONVERSION-GUIDE.md §11.
 * The Vue kit used a module-level `reactive({...})` singleton mutated by
 * exported functions and read via `computed` getters. The canonical React
 * port is a module-level singleton + `useSyncExternalStore`:
 *
 *   - Module-level `state` (NOT React Context) — matches Vue's module
 *     `reactive` and keeps history/persistence working as pure functions of
 *     the snapshot.
 *   - `subscribe(cb)` / `getEditorSnapshot()` for `useSyncExternalStore`.
 *   - Every mutation replaces `state` with a new top-level object (immutable
 *     update) + `emit()`, so the hook detects the change. Nested artboard
 *     mutations copy on write.
 *   - `useEditor(selector)` reads a derived slice; the selector must return a
 *     value whose identity is stable across renders that don't change it.
 *   - History snapshots `{artboards, groups}` (excludes viewport + selection
 *     deliberately).
 *   - `placeArtboard` centers inserts in the current viewport — kept verbatim.
 */

export type Viewport = { x: number; y: number; zoom: number };
export type Group = { id: string; name: string; collapsed: boolean };

export type EditorState = {
  artboards: Artboard[];
  groups: Group[];
  selectedIds: string[]; // multi-selected artboard ids
  selectedArtboardId: string; // primary (last selected)
  selectedLayerId: string;
  viewport: Viewport;
  replayToken: number;
  dataOpen: boolean;
  /** Transient snap guides shown while dragging (world coords), never persisted. */
  guides: { v: number | null; h: number | null };
};

function makeInitialState(): EditorState {
  const artboards = [createArtboard("area", 0, 0), createArtboard("bar", 600, 0)];
  return {
    artboards,
    groups: [],
    selectedIds: [],
    selectedArtboardId: "",
    selectedLayerId: "",
    viewport: { x: 96, y: 88, zoom: 1 },
    replayToken: 0,
    dataOpen: false,
    guides: { v: null, h: null },
  };
}

let state: EditorState = makeInitialState();
// Seed selection like the Vue module's top-level `selectArtboard(editor.artboards[0].id)`.
state = applySelectArtboard(state, state.artboards[0].id, false);

const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getEditorSnapshot(): EditorState {
  return state;
}

/** History snapshot — `{artboards, groups}` only (excludes viewport + selection).
 *  Used by `features/history` and `features/persistence`. */
export function snap(): string {
  return JSON.stringify({ artboards: state.artboards, groups: state.groups });
}

let gc = 0;
const gid = () => `grp${Date.now().toString(36)}${(gc++).toString(36)}`;

export const artboardIdOf = (layerId: string): string => layerId.split(":")[0];

function find(id: string): Artboard | undefined {
  return state.artboards.find((a) => a.id === id);
}

function membersOf(groupId: string): Artboard[] {
  return state.artboards.filter((a) => a.groupId === groupId);
}

// --- selection -------------------------------------------------------------

function applySelectArtboard(
  prev: EditorState,
  id: string,
  additive: boolean,
): EditorState {
  let selectedIds: string[];
  if (additive) {
    const i = prev.selectedIds.indexOf(id);
    selectedIds =
      i >= 0
        ? [...prev.selectedIds.slice(0, i), ...prev.selectedIds.slice(i + 1)]
        : [...prev.selectedIds, id];
  } else {
    selectedIds = [id];
  }
  const selectedArtboardId = selectedIds[selectedIds.length - 1] ?? "";
  const selectedLayerId = selectedArtboardId ? `${selectedArtboardId}:root` : "";
  return { ...prev, selectedIds, selectedArtboardId, selectedLayerId };
}

export function selectArtboard(id: string, additive = false): void {
  state = applySelectArtboard(state, id, additive);
  emit();
}

export function selectGroup(groupId: string): void {
  const ids = membersOf(groupId).map((a) => a.id);
  const selectedArtboardId = ids[ids.length - 1] ?? "";
  const selectedLayerId = selectedArtboardId ? `${selectedArtboardId}:root` : "";
  state = { ...state, selectedIds: ids, selectedArtboardId, selectedLayerId };
  emit();
}

export function selectLayer(id: string): void {
  const ab = artboardIdOf(id);
  state = { ...state, selectedIds: [ab], selectedArtboardId: ab, selectedLayerId: id };
  emit();
}

/** Replace the selection with an explicit id list (marquee / paste). */
export function selectMany(ids: string[]): void {
  const selectedArtboardId = ids[ids.length - 1] ?? "";
  const selectedLayerId = selectedArtboardId ? `${selectedArtboardId}:root` : "";
  state = { ...state, selectedIds: [...ids], selectedArtboardId, selectedLayerId };
  emit();
}

// Internal clipboard — a JSON snapshot so paste still works after a delete.
let clipboard: string | null = null;

export function copySelected(): void {
  const sel = state.artboards.filter((a) => state.selectedIds.includes(a.id));
  if (sel.length) clipboard = JSON.stringify(sel);
}

export function pasteClipboard(): void {
  if (!clipboard) return;
  const src = JSON.parse(clipboard) as Artboard[];
  const copies = src.map((a) => cloneArtboard(a));
  const artboards = [...state.artboards, ...copies];
  const ids = copies.map((c) => c.id);
  const selectedArtboardId = ids[ids.length - 1] ?? "";
  state = {
    ...state,
    artboards,
    selectedIds: ids,
    selectedArtboardId,
    selectedLayerId: selectedArtboardId ? `${selectedArtboardId}:root` : "",
  };
  emit();
}

export function deselect(): void {
  state = { ...state, selectedIds: [], selectedArtboardId: "", selectedLayerId: "" };
  emit();
}

const isSelected = (id: string): boolean => state.selectedIds.includes(id);

// --- artboards -------------------------------------------------------------

/** Place a new frame at the visible canvas center, not document origin/right edge. */
export function placeArtboard(a: Artboard): Artboard {
  const zoom = state.viewport.zoom || 1;
  const width = typeof window === "undefined" ? 1280 : window.innerWidth;
  const height = typeof window === "undefined" ? 720 : window.innerHeight;
  const placed: Artboard = {
    ...a,
    x: Math.round((width / 2 - state.viewport.x) / zoom - a.w / 2),
    y: Math.round((height / 2 - state.viewport.y) / zoom - a.h / 2),
  };
  state = { ...state, artboards: [...state.artboards, placed] };
  applySelectArtboardInPlace(placed.id, false);
  return placed;
}

/** Internal: mutate selection without an extra state object/emit round-trip. */
function applySelectArtboardInPlace(id: string, additive: boolean): void {
  state = applySelectArtboard(state, id, additive);
  emit();
}

export function addArtboard(kind: ArtboardKind): Artboard {
  return placeArtboard(createArtboard(kind));
}

/** Add a composed-screen artboard (rows of registry components). */
export function addScreenArtboard(): Artboard {
  const base = createArtboard("button");
  base.name = "Screen";
  base.w = 380;
  base.h = 560;
  base.widget = createScreen();
  return placeArtboard(base);
}

/** Add a registry-driven kit component as an artboard. */
export function addComponentArtboard(entry: ComponentEntry): Artboard {
  const base = createArtboard("button");
  base.name = entry.label;
  base.w = entry.frame.w;
  base.h = entry.frame.h;
  base.widget = createComponent(entry);
  return placeArtboard(base);
}

export function duplicateSelected(): void {
  const copies = state.selectedIds
    .map(find)
    .filter((a): a is Artboard => !!a)
    .map((a) => cloneArtboard(a));
  if (!copies.length) return;
  const artboards = [...state.artboards, ...copies];
  const selectedIds = copies.map((c) => c.id);
  const selectedArtboardId = copies[copies.length - 1].id;
  state = {
    ...state,
    artboards,
    selectedIds,
    selectedArtboardId,
    selectedLayerId: `${selectedArtboardId}:root`,
  };
  emit();
}

export function removeSelected(): void {
  const gone = new Set(state.selectedIds);
  const artboards = state.artboards.filter((a) => !gone.has(a.id));
  state = { ...state, artboards };
  const first = artboards[0];
  if (first) selectArtboard(first.id);
  else deselect();
}

export function removeArtboard(id: string): void {
  const artboards = state.artboards.filter((a) => a.id !== id);
  state = { ...state, artboards };
  if (isSelected(id)) {
    const first = artboards[0];
    if (first) selectArtboard(first.id);
    else deselect();
  } else {
    emit();
  }
}

export function moveArtboard(id: string, dx: number, dy: number): void {
  const a = find(id);
  if (!a || a.locked) return;
  const artboards = state.artboards.map((b) =>
    b.id === id ? { ...b, x: b.x + dx, y: b.y + dy } : b,
  );
  state = { ...state, artboards };
  emit();
}

/** Move every selected (unlocked) artboard by the same delta. */
export function moveSelected(dx: number, dy: number): void {
  const ids = state.selectedIds;
  if (!ids.length) return;
  const locked = new Set<string>();
  const artboards = state.artboards.map((b) => {
    if (!ids.includes(b.id)) return b;
    if (b.locked) {
      locked.add(b.id);
      return b;
    }
    return { ...b, x: b.x + dx, y: b.y + dy };
  });
  state = { ...state, artboards };
  emit();
}

export function resizeArtboard(id: string, w: number, h: number): void {
  const a = find(id);
  if (!a || a.locked) return;
  const artboards = state.artboards.map((b) =>
    b.id === id
      ? { ...b, w: Math.max(260, Math.round(w)), h: Math.max(200, Math.round(h)) }
      : b,
  );
  state = { ...state, artboards };
  emit();
}

export function setArtboardHidden(id: string, v: boolean): void {
  const artboards = state.artboards.map((b) => (b.id === id ? { ...b, hidden: v } : b));
  state = { ...state, artboards };
  emit();
}

export function setArtboardLocked(id: string, v: boolean): void {
  const artboards = state.artboards.map((b) => (b.id === id ? { ...b, locked: v } : b));
  state = { ...state, artboards };
  emit();
}

/** Immutably patch the selected artboard's chart via a producer. */
export function patchSelectedChart(producer: (chart: Artboard["chart"]) => void): void {
  const id = state.selectedArtboardId;
  if (!id) return;
  const artboards = state.artboards.map((b) => {
    if (b.id !== id || b.widget) return b;
    const chart = JSON.parse(JSON.stringify(b.chart)) as Artboard["chart"];
    producer(chart);
    return { ...b, chart };
  });
  state = { ...state, artboards };
  emit();
}

export function setSelectedType(type: ChartType): void {
  const id = state.selectedArtboardId;
  if (!id) return;
  const a = find(id);
  if (!a || a.widget) return; // widget frames have no chart type
  const artboards = state.artboards.map((b) => {
    if (b.id !== id) return b;
    const chart = JSON.parse(JSON.stringify(b.chart)) as Artboard["chart"];
    setChartType(chart, type);
    return { ...b, chart };
  });
  state = {
    ...state,
    artboards,
    selectedLayerId: `${id}:root`,
    replayToken: state.replayToken + 1,
  };
  emit();
}

// --- groups ----------------------------------------------------------------

export function groupSelected(): void {
  if (state.selectedIds.length < 1) return;
  const g: Group = { id: gid(), name: `Group ${state.groups.length + 1}`, collapsed: false };
  const groups = [...state.groups, g];
  const artboards = state.artboards.map((b) =>
    state.selectedIds.includes(b.id) ? { ...b, groupId: g.id } : b,
  );
  state = { ...state, groups, artboards };
  emit();
}

export function ungroup(groupId: string): void {
  const artboards = state.artboards.map((b) =>
    b.groupId === groupId ? { ...b, groupId: null } : b,
  );
  const groups = state.groups.filter((g) => g.id !== groupId);
  state = { ...state, artboards, groups };
  emit();
}

export function setGroupHidden(groupId: string, v: boolean): void {
  const ids = new Set(membersOf(groupId).map((a) => a.id));
  const artboards = state.artboards.map((b) => (ids.has(b.id) ? { ...b, hidden: v } : b));
  state = { ...state, artboards };
  emit();
}

export function setGroupLocked(groupId: string, v: boolean): void {
  const ids = new Set(membersOf(groupId).map((a) => a.id));
  const artboards = state.artboards.map((b) => (ids.has(b.id) ? { ...b, locked: v } : b));
  state = { ...state, artboards };
  emit();
}

export function deleteGroup(groupId: string): void {
  const gone = new Set(membersOf(groupId).map((a) => a.id));
  const artboards = state.artboards.filter((a) => !gone.has(a.id));
  const groups = state.groups.filter((g) => g.id !== groupId);
  state = { ...state, artboards, groups };
  const first = artboards[0];
  if (first) selectArtboard(first.id);
  else deselect();
}

// --- series ----------------------------------------------------------------

export function deleteSeries(key: string): void {
  const id = state.selectedArtboardId;
  if (!id) return;
  const artboards = state.artboards.map((b) => {
    if (b.id !== id || b.widget) return b;
    const chart = JSON.parse(JSON.stringify(b.chart)) as Artboard["chart"];
    chart.series = chart.series.filter((s) => s.key !== key);
    return { ...b, chart };
  });
  let selectedLayerId = state.selectedLayerId;
  if (selectedLayerId.endsWith(`:series:${key}`))
    selectedLayerId = `${id}:root`;
  state = { ...state, artboards, selectedLayerId };
  emit();
}

export function replay(): void {
  state = { ...state, replayToken: state.replayToken + 1 };
  emit();
}

// --- getters (selectors) ----------------------------------------------------

export function selectedArtboard(): Artboard | null {
  return state.artboards.find((a) => a.id === state.selectedArtboardId) ?? null;
}

export function selectedChart(): Artboard["chart"] | null {
  return selectedArtboard()?.chart ?? null;
}

export function selectedLayers(): Layer[] {
  const ab = selectedArtboard();
  return ab ? layersOf(ab.chart, ab.id) : [];
}

// --- viewport (pan-zoom writes here) ---------------------------------------

export function setViewport(viewport: Viewport): void {
  state = { ...state, viewport };
  emit();
}

export function setDataOpen(dataOpen: boolean): void {
  state = { ...state, dataOpen };
  emit();
}

export function setGuides(guides: EditorState["guides"]): void {
  state = { ...state, guides };
  emit();
}

// --- React hook ------------------------------------------------------------

/**
 * Read a derived slice of the editor state. The selector runs on every store
 * emit; React bails out when the returned value is referentially stable
 * (primitives, or memoized arrays/objects the caller builds from stable inputs).
 *
 * Use the broad selectors above (`selectedArtboard`, `selectedChart`,
 * `selectedLayers`) for non-reactive reads; use this hook inside components.
 */
export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}
