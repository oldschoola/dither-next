"use client";

import { useEffect, useRef, useState } from "react";
import type { Artboard } from "@/entities/artboard";
import { chartCode } from "@/entities/chart";
import { getEditorSnapshot, useEditor } from "@/entities/editor";
import { widgetCode } from "@/entities/widget";
import { CodeBlock } from "@/shared/ui";
import { cn } from "@/shared/lib";

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

function codeFor(a: Artboard): string {
  return a.widget ? widgetCode(a.widget, { w: a.w, h: a.h }) : chartCode(a.chart);
}

function fileName(a: Artboard): string {
  return `${a.name.replace(/[^\w-]+/g, "-").toLowerCase() || "artboard"}.vue`;
}

/** Download every artboard as its own .vue file. The Vue SFC staggered the
 *  downloads (120ms) so the browser accepts the burst as one user gesture —
 *  preserved verbatim. A recursive `setTimeout` chain replaces the Vue
 *  `await new Promise(r => setTimeout(r, 120))` so no promise executor is
 *  needed. Reads the live snapshot so it works from a one-shot click. */
function downloadAll(list: readonly Artboard[], i = 0): void {
  if (i >= list.length) return;
  const a = list[i];
  const blob = new Blob([codeFor(a)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName(a);
  link.click();
  URL.revokeObjectURL(url);
  setTimeout(() => downloadAll(list, i + 1), 120);
}

/**
 * ExportDialog — a code-export modal. Verbatim port of
 * `src/features/export-code/ExportDialog.vue`.
 *
 * Generates Vue SFC code for the selected artboard's chart or widget via
 * `chartCode`/`widgetCode`. Copy + download-all buttons; the close button
 * is focused on open (the Vue `nextTick(() => closeRef.value?.focus())`
 * becomes a `useEffect` on `open`, guide §7). The overlay stays mounted
 * and fades via an opacity class (guide §6); Escape closes.
 *
 * The selected artboard is subscribed via `useEditor` so the code updates
 * live when the selection changes while the dialog is open (the Vue SFC
 * read `selectedArtboard.value` from a `computed` — the React port reads
 * the same selector reactively here).
 */
export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const artboards = useEditor((s) => s.artboards);
  const selectedArtboardId = useEditor((s) => s.selectedArtboardId);
  const a = artboards.find((ab) => ab.id === selectedArtboardId) ?? null;
  const chart = a?.chart ?? null;
  const count = artboards.length;

  const code = !a
    ? "// select an artboard"
    : a.widget
      ? widgetCode(a.widget, { w: a.w, h: a.h })
      : chart
        ? chartCode(chart)
        : "// select an artboard";

  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (open) {
      // nextTick → deferred focus; the button is always mounted (the overlay
      // never unmounts, only fades), so a 0ms timeout suffices.
      const id = window.setTimeout(() => closeRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  async function copy(): Promise<void> {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export code"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 transition-opacity duration-150",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <span className="text-sm font-medium">Export — Vue SFC</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title={`Download every artboard as its own .vue file (${count})`}
              className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => downloadAll(getEditorSnapshot().artboards)}
            >
              download all ({count})
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md border border-border px-2.5 py-1 text-[11px] transition-colors",
                copied
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => void copy()}
            >
              {copied ? "copied" : "copy"}
            </button>
            <button
              ref={closeRef}
              type="button"
              className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>
        <div className="overflow-auto p-4">
          <CodeBlock code={code} />
        </div>
      </div>
    </div>
  );
}
