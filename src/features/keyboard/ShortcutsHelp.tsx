"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/lib";

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "Edit",
    keys: [
      ["⌘Z", "Undo"],
      ["⌘⇧Z", "Redo"],
      ["⌘D", "Duplicate"],
      ["⌫", "Delete"],
      ["⌘G", "Group"],
      ["⌘⇧G", "Ungroup"],
      ["⌘L", "Lock / unlock"],
    ],
  },
  {
    title: "Move",
    keys: [
      ["↑↓←→", "Nudge 1px"],
      ["⇧ + arrows", "Nudge 10px"],
      ["Esc", "Deselect"],
    ],
  },
  {
    title: "View",
    keys: [
      ["⌘+ / ⌘−", "Zoom in / out"],
      ["⌘0", "Zoom to 100%"],
      ["⇧1", "Fit to screen"],
      ["⇧2", "Fit selection"],
    ],
  },
];

const isTyping = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
  );
};

/**
 * ShortcutsHelp — a "?"-toggled keyboard-shortcut reference dialog.
 * Verbatim port of `src/features/keyboard/ShortcutsHelp.vue`.
 *
 * A single window `keydown` listener (capture phase, like the Vue
 * `addEventListener("keydown", onKey, true)`) toggles `open`. The overlay
 * stays mounted and fades via an opacity class (guide §6) so the leave
 * transition has a DOM to animate. Escape closes (and stops propagation so
 * it doesn't also trigger the global deselect).
 */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (open && e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        return;
      }
      if (e.key === "?" && !isTyping(e.target)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    // `true` = capture, mirroring the Vue kit's listener phase.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 transition-opacity duration-150",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      onClick={() => setOpen(false)}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Keyboard shortcuts</span>
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="mt-4 grid gap-5">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {g.title}
              </div>
              <dl className="mt-2 grid gap-1.5">
                {g.keys.map(([k, label]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between text-xs"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                      {k}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[10px] text-muted-foreground">
          Press ? to toggle this panel
        </p>
      </div>
    </div>
  );
}
