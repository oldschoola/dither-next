"use client";

import { useEffect, type RefObject } from "react";

/**
 * Focus trap — verbatim port of the hand-rolled logic in DitherDialog.vue /
 * DitherAlertDialog.vue (guide §7). NO `react-focus-lock` dependency.
 *
 * Behaviour mirrors the Vue kit exactly:
 * - On activation, capture the currently-focused element as `previousFocus`.
 * - Tab cycles within `container` (Shift+Tab on the first item wraps to the
 *   last; Tab on the last wraps to the first). When there are no focusable
 *   items, Tab is suppressed so focus can't escape to the page behind.
 * - Escape is left to the consumer (dialogs map it to onClose/onCancel) — this
 *   hook only owns the Tab cycle + focus restoration.
 * - On deactivation or unmount, focus is restored to `previousFocus`.
 *
 * The trap is a property of the open dialog, so `active` gates everything:
 * when false, no listeners are attached and focus is not touched.
 */
const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  container: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const node = container.current;
    if (!node) return;

    const previousFocus = document.activeElement as HTMLElement | null;

    function focusable(): HTMLElement[] {
      return Array.from(
        node!.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    }

    function onKeydown(e: KeyboardEvent): void {
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    // Attach to the container so a nested keydown handler can call
    // stopPropagation for Escape (the Vue kit does `@keydown` on the panel and
    // `e.stopPropagation()` for Escape). Tab cycling is the trap's job.
    node.addEventListener("keydown", onKeydown);

    return () => {
      node.removeEventListener("keydown", onKeydown);
      // Restore focus to whatever opened the dialog. Guard against the element
      // having been removed from the DOM in the meantime.
      if (previousFocus && document.contains(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, [container, active]);
}
