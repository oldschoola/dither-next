"use client";

import { useSyncExternalStore } from "react";
import { type Artboard, normalizeArtboard } from "@/entities/artboard";
import type { ChartModel } from "@/entities/chart";
import { placeArtboard } from "@/entities/editor";

const KEY = "dither-studio-presets-v1";

export type Preset = { name: string; chart: ChartModel };

// --- preset store (module-level, mirrors Vue reactive) ---------------------

let presets: Preset[] = load();
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

function subscribePresets(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Preset[] {
  return presets;
}

function load(): Preset[] {
  try {
    const raw = localStorage.getItem(KEY);
    const d = raw ? JSON.parse(raw) : [];
    return Array.isArray(d) ? (d as Preset[]) : [];
  } catch {
    return [];
  }
}

const save = (): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(presets));
  } catch {
    // quota / privacy mode — presets just stay session-local
  }
};

/** Snapshot an artboard's chart under a name (replaces a same-named preset). */
export function savePreset(name: string, artboard: Artboard): void {
  const clean = name.trim();
  if (!clean || artboard.widget) return;
  const chart = JSON.parse(JSON.stringify(artboard.chart)) as ChartModel;
  const i = presets.findIndex((p) => p.name === clean);
  if (i >= 0) presets = [...presets.slice(0, i), { name: clean, chart }, ...presets.slice(i + 1)];
  else presets = [...presets, { name: clean, chart }];
  save();
  emit();
}

export function removePreset(name: string): void {
  const i = presets.findIndex((p) => p.name === name);
  if (i >= 0) {
    presets = [...presets.slice(0, i), ...presets.slice(i + 1)];
    save();
    emit();
  }
}

let counter = 0;
const uid = (): string => `ab${Date.now().toString(36)}p${(counter++).toString(36)}`;

/** Add a new artboard seeded from a preset's chart. */
export function addArtboardFromPreset(preset: Preset): void {
  const a: Artboard = {
    id: uid(),
    name: preset.name,
    x: 0,
    y: 0,
    w: 520,
    h: 360,
    hidden: false,
    locked: false,
    groupId: null,
    chart: JSON.parse(JSON.stringify(preset.chart)) as ChartModel,
  };
  // Presets saved by an older schema get missing fields filled from defaults.
  placeArtboard(normalizeArtboard(a));
}

/** React hook: reactive preset list. */
export function usePresets(): Preset[] {
  return useSyncExternalStore(subscribePresets, getSnapshot, getSnapshot);
}
