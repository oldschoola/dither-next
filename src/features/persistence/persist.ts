"use client";

import { createArtboard, normalizeArtboard, type Artboard } from "@/entities/artboard";
import {
  getEditorSnapshot,
  placeArtboard,
  restoreDoc,
  selectArtboard,
  setDataOpen,
  setViewport,
  snap,
  subscribe,
  type Viewport,
  type Group,
} from "@/entities/editor";
import { resetHistory } from "@/features/history";
import { useSyncExternalStore } from "react";

/** Per-visitor project workspace. Every browser owns its own project list in
 * localStorage — deployed publicly, users are isolated by construction (zero
 * shared state), and on a shared machine each person can keep their own named
 * projects instead of stomping one implicit document.
 *
 * Port of `src/features/persistence/persist.ts`. The Vue version used reactive
 * `projects` / `activeProjectId` + deep `watch` for autosave; here the project
 * list is a small module store (`useSyncExternalStore`) and autosave subscribes
 * to the editor store with a debounce. */

const INDEX_KEY = "dither-studio-projects";
const ACTIVE_KEY = "dither-studio-active";
const DOC_PREFIX = "dither-studio-doc-";
const LEGACY_KEY = "dither-studio-v8";

export type ProjectMeta = { id: string; name: string; updatedAt: number };

type Doc = {
  artboards: unknown[];
  groups?: unknown[];
  viewport?: { x: number; y: number; zoom: number };
};

// --- project list store (module-level, mirrors Vue reactive) ---------------

let projects: ProjectMeta[] = [];
let activeId = "";
const projectListeners = new Set<() => void>();

function emitProjects(): void {
  for (const fn of projectListeners) fn();
}

function subscribeProjects(cb: () => void): () => void {
  projectListeners.add(cb);
  return () => projectListeners.delete(cb);
}

function getProjectsSnapshot(): ProjectMeta[] {
  return projects;
}

function getActiveIdSnapshot(): string {
  return activeId;
}

function setActiveId(id: string): void {
  activeId = id;
  emitProjects();
}

function setProjects(next: ProjectMeta[]): void {
  projects = next;
  emitProjects();
}

function mutateProjects(fn: (p: ProjectMeta[]) => void): void {
  // Operate on a shallow copy so the array identity changes (useSyncExternalStore).
  const copy = [...projects];
  fn(copy);
  projects = copy;
  emitProjects();
}

// --- localStorage helpers ---------------------------------------------------

const readJson = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / privacy mode — keep editing, persistence is best-effort
  }
};

const saveIndex = (): void => writeJson(INDEX_KEY, projects);

const touch = (id: string): void => {
  const meta = projects.find((p) => p.id === id);
  if (meta) {
    meta.updatedAt = Date.now();
    emitProjects();
  }
};

/** Snapshot the full editor doc (artboards, groups, viewport) for saving. */
const snapshotDoc = (): Doc => {
  const s = getEditorSnapshot();
  const parsed = JSON.parse(snap()) as { artboards: Artboard[]; groups: Group[] };
  return { artboards: parsed.artboards, groups: parsed.groups, viewport: s.viewport };
};

const isPlain = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

let abFallback = 0;
/** Envelope validation for untrusted documents (imports, tampered storage):
 * only plain-object artboards survive, ids are guaranteed strings, groups are
 * shape-checked, and the viewport must be finite numbers. Field-level
 * sanitisation happens in normalizeArtboard. */
function validDoc(d: Doc): {
  artboards: Parameters<typeof normalizeArtboard>[0][];
  groups: Group[];
  viewport: Viewport | null;
} | null {
  const artboards = (Array.isArray(d.artboards) ? d.artboards : [])
    .filter(isPlain)
    .map((a) => {
      if (typeof a.id !== "string" || !a.id) a.id = `ab-imported-${abFallback++}`;
      if (typeof a.name !== "string") a.name = "Artboard";
      for (const k of ["x", "y", "w", "h"] as const) {
        if (typeof a[k] !== "number" || !Number.isFinite(a[k]))
          a[k] = k === "w" ? 520 : k === "h" ? 360 : 0;
      }
      return a as unknown as Parameters<typeof normalizeArtboard>[0];
    });
  if (!artboards.length) return null;
  const groups = (Array.isArray(d.groups) ? d.groups : [])
    .filter(isPlain)
    .filter((g) => typeof g.id === "string" && typeof g.name === "string")
    .map((g) => ({
      id: g.id as string,
      name: g.name as string,
      collapsed: g.collapsed === true,
    }));
  const v = d.viewport;
  const viewport =
    isPlain(v) && [v.x, v.y, v.zoom].every((n) => typeof n === "number" && Number.isFinite(n))
      ? {
          x: v.x as number,
          y: v.y as number,
          zoom: Math.min(3, Math.max(0.2, v.zoom as number)),
        }
      : null;
  return { artboards, groups, viewport };
}

function applyDoc(d: Doc | null): void {
  const valid = d ? validDoc(d) : null;
  if (valid) {
    const artboards = valid.artboards.map(normalizeArtboard);
    restoreDoc({ artboards, groups: valid.groups, viewport: valid.viewport ?? undefined });
    selectArtboard(artboards[0].id);
  } else {
    restoreDoc({ artboards: [], groups: [] });
    setViewport({ x: 96, y: 88, zoom: 1 });
    placeArtboard(createArtboard("area"));
  }
  setDataOpen(false);
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
/** Write the current editor state to the active project immediately. */
export function flushSave(): void {
  if (saveTimer !== undefined) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
  }
  if (!activeId) return;
  writeJson(DOC_PREFIX + activeId, snapshotDoc());
  touch(activeId);
  saveIndex();
}

let pc = 0;
const uid = (): string => `p${Date.now().toString(36)}${(pc++).toString(36)}`;

/** Restore the workspace (run in the page boot effect, before first paint
 *  AND before startHistory). */
export function hydrate(): void {
  const index = readJson<ProjectMeta[]>(INDEX_KEY);
  if (Array.isArray(index)) setProjects(index);

  // Migrate the legacy single-document world into the first project.
  if (!projects.length) {
    const legacy = readJson<Doc>(LEGACY_KEY);
    const meta: ProjectMeta = { id: uid(), name: "My project", updatedAt: Date.now() };
    setProjects([meta]);
    if (legacy) {
      writeJson(DOC_PREFIX + meta.id, legacy);
      localStorage.removeItem(LEGACY_KEY);
    }
    saveIndex();
  }

  const requested = localStorage.getItem(ACTIVE_KEY);
  const active = projects.find((p) => p.id === requested) ?? projects[0];
  if (active) {
    setActiveId(active.id);
    localStorage.setItem(ACTIVE_KEY, active.id);
    applyDoc(readJson<Doc>(DOC_PREFIX + active.id));
  }
}

export function createProject(name: string): void {
  const clean = name.trim() || `Project ${projects.length + 1}`;
  flushSave();
  const meta: ProjectMeta = { id: uid(), name: clean, updatedAt: Date.now() };
  mutateProjects((p) => p.push(meta));
  setActiveId(meta.id);
  localStorage.setItem(ACTIVE_KEY, meta.id);
  applyDoc(null); // fresh default document
  flushSave();
  resetHistory();
}

export function switchProject(id: string): void {
  if (id === activeId) return;
  const meta = projects.find((p) => p.id === id);
  if (!meta) return;
  flushSave();
  setActiveId(id);
  localStorage.setItem(ACTIVE_KEY, id);
  applyDoc(readJson<Doc>(DOC_PREFIX + id));
  resetHistory();
}

export function renameProject(id: string, name: string): void {
  const clean = name.trim();
  const meta = projects.find((p) => p.id === id);
  if (!meta || !clean) return;
  meta.name = clean;
  emitProjects();
  saveIndex();
}

export function deleteProject(id: string): void {
  const i = projects.findIndex((p) => p.id === id);
  if (i < 0) return;
  mutateProjects((p) => p.splice(i, 1));
  localStorage.removeItem(DOC_PREFIX + id);
  if (activeId === id) {
    if (projects.length) {
      setActiveId("");
      switchProject(projects[0].id);
    } else {
      setActiveId("");
      createProject("My project");
    }
  } else {
    saveIndex();
  }
}

export const activeProjectName = (): string =>
  projects.find((p) => p.id === activeId)?.name ?? "My project";

/** Download the active project as a .json file. */
export function exportDocument(): void {
  const blob = new Blob([JSON.stringify(snapshotDoc(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${activeProjectName().replace(/[^\w-]+/g, "-").toLowerCase() || "project"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Load a project .json file into the active project. Invalid files are ignored. */
export async function importDocument(file: File): Promise<boolean> {
  try {
    const d = JSON.parse(await file.text()) as Doc;
    if (!Array.isArray(d.artboards) || !d.artboards.length) return false;
    applyDoc(d);
    flushSave();
    resetHistory();
    return true;
  } catch {
    return false;
  }
}

let autosaveUnsub: (() => void) | undefined;
const scheduleSave = (): void => {
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 400);
};

export function startAutosave(): void {
  stopAutosave();
  autosaveUnsub = subscribe(scheduleSave);
}

export function stopAutosave(): void {
  autosaveUnsub?.();
  autosaveUnsub = undefined;
  if (saveTimer !== undefined) flushSave();
}

// --- React hooks -----------------------------------------------------------

export function useProjects(): ProjectMeta[] {
  return useSyncExternalStore(subscribeProjects, getProjectsSnapshot, getProjectsSnapshot);
}

export function useActiveProjectId(): string {
  return useSyncExternalStore(subscribeProjects, getActiveIdSnapshot, getActiveIdSnapshot);
}
