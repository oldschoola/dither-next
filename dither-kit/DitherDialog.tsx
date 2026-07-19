"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { CONTROL_BUTTON } from "./control";
import { cn } from "./lib";
import { useFocusTrap } from "./use-focus-trap";
import { useInDom } from "./use-in-dom";
import { usePresence } from "./use-presence";
import styles from "./overlay-transitions.module.css";

export interface DitherDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  closeOnBackdrop?: boolean;
  class?: string;
  onClose?: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * DitherDialog — modal dialog rendered into `document.body` via a portal
 * (guide §6: `<Teleport to="body">` → `createPortal`). Verbatim port of
 * DitherDialog.vue.
 *
 * Focus management mirrors the Vue kit: on open, the close button is focused;
 * Tab cycles within the panel (see `useFocusTrap`); on close/unmount focus is
 * restored to whatever opened the dialog. Escape closes (the Vue kit calls
 * `e.stopPropagation()` so an outer dialog's Escape handler doesn't also fire —
 * preserved here).
 *
 * The panel stays mounted during its leave transition (see `usePresence`,
 * guide §6). SSR-safe: the portal only mounts after `useEffect` commits, so
 * server renders emit nothing.
 */
export function DitherDialog({
  open,
  title,
  description,
  closeOnBackdrop = true,
  class: className,
  onClose,
  children,
  footer,
}: DitherDialogProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  // Stable unique ids for aria labelling — React's useId is SSR-stable, unlike
  // the Vue kit's module-level counter (good improvement, same a11y contract).
  const reactId = useId();
  const titleId = `${reactId}-title`;
  const descriptionId = `${reactId}-description`;

  // Focus trap owns Tab cycling + focus restoration. Active only while open.
  useFocusTrap(panelRef, open);

  // On open, focus the close button (or first focusable) once the panel mounts.
  // A `useEffect` (post-paint) focusing on the now-mounted close button is the
  // faithful port of the Vue `nextTick(focusInitial)` (guide §7): the portal
  // node is in the DOM by the time the effect runs.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  function onKeydown(e: React.KeyboardEvent): void {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose?.();
    }
  }

  function onBackdropPointerDown(e: React.PointerEvent): void {
    if (e.target !== e.currentTarget) return; // `.self` guard
    if (closeOnBackdrop) onClose?.();
  }

  // 180ms = the longest transition (panel transform, `.dialogPanel`).
  const mounted = usePresence(open, 180);
  // SSR guard: the component is `"use client"` but Next.js still renders it on
  // the server during SSR of a parent page. `document` is unavailable there.
  const inDom = useInDom();

  if (!inDom || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        styles.dialogBackdrop,
        "fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-6",
        !open && styles.dialogBackdropHide,
      )}
      onPointerDown={onBackdropPointerDown}
      onKeyDown={onKeydown}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : "Dialog"}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          styles.dialogPanel,
          "w-full max-w-md overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]",
          !open && styles.dialogPanelHide,
          className,
        )}
      >
        <header className="flex min-h-12 items-start justify-between gap-4 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            {title ? (
              <h2 id={titleId} className="text-sm font-medium text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-[12px] leading-relaxed text-muted-foreground"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className={cn(
              CONTROL_BUTTON,
              "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground",
            )}
            aria-label="Close"
            onClick={() => onClose?.()}
          >
            ×
          </button>
        </header>
        <div className="p-4">{children}</div>
        {footer ? (
          <footer className="flex justify-end gap-2 border-t border-border/60 px-4 py-3">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
