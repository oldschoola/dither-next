"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { DitherButton } from "./DitherButton";
import { CONTROL_BUTTON } from "./control";
import { cn } from "./lib";
import { useFocusTrap } from "./use-focus-trap";
import { useInDom } from "./use-in-dom";
import { usePresence } from "./use-presence";
import styles from "./overlay-transitions.module.css";

export interface DitherAlertDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * DitherAlertDialog — alert dialog with confirm/cancel buttons. Verbatim port
 * of DitherAlertDialog.vue. Same patterns as `DitherDialog` (portal, focus
 * trap, CSS presence transition) plus alert semantics (`role="alertdialog"`).
 *
 * `DitherButton` is the dithered confirm button (red when `danger`). It is a
 * cross-group import (`./DitherButton`, Standalone group) — see the ownership
 * map. Cancel is a plain bordered button matching the Vue kit's markup.
 */
export function DitherAlertDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: DitherAlertDialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap(panelRef, open);

  // Focus the cancel button on open (safe destructive default). Mirrors the
  // Vue `nextTick(() => cancelRef.value?.focus())` (guide §7).
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => cancelRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  function onKeydown(e: React.KeyboardEvent): void {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel?.();
    }
  }
  function onBackdropPointerDown(e: React.PointerEvent): void {
    if (e.target !== e.currentTarget) return; // `.self` guard
    onCancel?.();
  }

  const mounted = usePresence(open, 160);
  const inDom = useInDom();
  if (!inDom || !mounted) return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className={cn(
        styles.fadeCard,
        "fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-6",
        !open && styles.fadeHide,
      )}
      onPointerDown={onBackdropPointerDown}
      onKeyDown={onKeydown}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-xl border border-border/80 bg-card shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
      >
        <div className="px-4 pt-4">
          <span className="text-sm font-medium">{title}</span>
          {description ? (
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 p-4">
          <button
            ref={cancelRef}
            type="button"
            className={cn(
              CONTROL_BUTTON,
              "min-h-10 rounded-md border border-border px-4 py-2 font-mono text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground",
            )}
            onClick={() => onCancel?.()}
          >
            {cancelLabel}
          </button>
          <DitherButton
            color={danger ? "red" : "blue"}
            onClick={() => onConfirm?.()}
          >
            {confirmLabel}
          </DitherButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
