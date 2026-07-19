"use client";

import { useEffect } from "react";
import {
  copySelected,
  deselect,
  duplicateSelected,
  getEditorSnapshot,
  groupSelected,
  moveSelected,
  pasteClipboard,
  removeSelected,
  setArtboardLocked,
  selectedArtboard,
  ungroup,
} from "@/entities/editor";
import { redo, undo } from "@/features/history";
import type { ZoomControls } from "@/features/pan-zoom";

const isTyping = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  return (
    !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
  );
};

/** Familiar editor keybindings, installed at the window level. Port of
 * `src/features/keyboard/useShortcuts.ts`. The Vue SFC used
 * `onMounted`/`onBeforeUnmount`; here a single effect owns the listener and
 * tears it down on unmount (guide §2). `zoom` controls come from the canvas. */
export function useShortcuts(zoom: ZoomControls): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey;

      if (isTyping(e.target)) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }

      // History
      if (mod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // Zoom
      if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoom.zoomIn();
        return;
      }
      if (mod && e.key === "-") {
        e.preventDefault();
        zoom.zoomOut();
        return;
      }
      if ((mod && e.key === "0") || (e.shiftKey && e.key === "0")) {
        e.preventDefault();
        zoom.resetZoom();
        return;
      }
      if (e.shiftKey && e.key === "1") {
        e.preventDefault();
        zoom.fit();
        return;
      }
      if (e.shiftKey && e.key === "2") {
        e.preventDefault();
        zoom.fitSelection();
        return;
      }

      // Selection
      const s = getEditorSnapshot();
      const hasSel = s.selectedArtboardId !== "";
      if (e.key === "Escape") {
        deselect();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && hasSel) {
        e.preventDefault();
        removeSelected();
        return;
      }
      if (mod && (e.key === "d" || e.key === "D") && hasSel) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (mod && (e.key === "c" || e.key === "C") && hasSel) {
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (mod && e.shiftKey && (e.key === "g" || e.key === "G")) {
        e.preventDefault();
        const a = selectedArtboard();
        if (a?.groupId) ungroup(a.groupId);
        return;
      }
      if (mod && (e.key === "g" || e.key === "G") && hasSel) {
        e.preventDefault();
        groupSelected();
        return;
      }
      if (mod && (e.key === "l" || e.key === "L") && hasSel) {
        e.preventDefault();
        const lock = !(selectedArtboard()?.locked ?? false);
        for (const sid of s.selectedIds) setArtboardLocked(sid, lock);
        return;
      }

      // Nudge
      if (hasSel && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowLeft") moveSelected(-step, 0);
        else if (e.key === "ArrowRight") moveSelected(step, 0);
        else if (e.key === "ArrowUp") moveSelected(0, -step);
        else if (e.key === "ArrowDown") moveSelected(0, step);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);
}
