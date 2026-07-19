"use client";

import { restoreDoc, snap, subscribe } from "@/entities/editor";
import type { Artboard } from "@/entities/artboard";
import type { Group } from "@/entities/editor";
import { useSyncExternalStore } from "react";

/** Snapshot-based undo/redo over the document (artboards + groups).
 * Viewport and selection are deliberately excluded — pan/zoom is not an edit.
 * Mutations are coalesced per 300ms window, so a drag is one history entry.
 *
 * Port of `src/features/history/history.ts`. The Vue version used a deep
 * `watch(() => [editor.artboards, editor.groups], ...)`; here we subscribe to
 * the store's emit and debounce a snapshot push. The `muted` flag swallows the
 * echo caused by `restore()` itself (restoreDoc emits, but we don't want that
 * emit to push a new history entry). */

const MAX = 50;
const undoStack: string[] = [];
const redoStack: string[] = [];
let last = "";
let timer: ReturnType<typeof setTimeout> | undefined;
let muted = false;

/** Reactive view over the stacks — what toolbar buttons bind to. A pending
 * debounce window counts as undoable so the button lights up on first edit. */
const historyState = { canUndo: false, canRedo: false };
const historyListeners = new Set<() => void>();

function emitHistory(): void {
  for (const fn of historyListeners) fn();
}

function sync(): void {
  historyState.canUndo = undoStack.length > 0 || timer !== undefined;
  historyState.canRedo = redoStack.length > 0;
  emitHistory();
}

function subscribeHistory(cb: () => void): () => void {
  historyListeners.add(cb);
  return () => historyListeners.delete(cb);
}

function getHistorySnapshot(): { canUndo: boolean; canRedo: boolean } {
  return historyState;
}

function push(): void {
  const cur = snap();
  if (cur === last) return;
  undoStack.push(last);
  if (undoStack.length > MAX) undoStack.shift();
  redoStack.length = 0;
  last = cur;
}

function flush(): void {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  push();
  sync();
}

function restore(s: string): void {
  const d = JSON.parse(s) as { artboards: Artboard[]; groups: Group[] };
  muted = true;
  restoreDoc({ artboards: d.artboards, groups: d.groups });
  last = s;
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  sync();
}

export function undo(): void {
  flush();
  const prev = undoStack.pop();
  if (prev === undefined) return;
  redoStack.push(snap());
  restore(prev);
}

export function redo(): void {
  flush(); // a pending edit invalidates the redo branch
  const next = redoStack.pop();
  if (next === undefined) return;
  undoStack.push(snap());
  restore(next);
}

/** Re-baseline on the current document and clear both stacks — used when a
 * different project loads so undo can never bleed across projects. */
export function resetHistory(): void {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  undoStack.length = 0;
  redoStack.length = 0;
  last = snap();
  muted = true; // swallow the watcher echo from the project switch itself
  sync();
}

/** Install after hydrate() so the restored document is the history baseline.
 *  Singleton — calling twice re-baselines (matches Vue's `stopWatch?.()`). */
let unsub: (() => void) | undefined;
export function startHistory(): void {
  stopHistory();
  last = snap();
  muted = false;
  unsub = subscribe(() => {
    if (muted) {
      muted = false;
      return;
    }
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(flush, 300);
    sync();
  });
}

export function stopHistory(): void {
  unsub?.();
  unsub = undefined;
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
  sync();
}

/** React hook: reactive {canUndo, canRedo} for toolbar buttons. */
export function useHistory(): { canUndo: boolean; canRedo: boolean } {
  return useSyncExternalStore(subscribeHistory, getHistorySnapshot, getHistorySnapshot);
}
