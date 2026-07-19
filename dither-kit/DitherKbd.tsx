import type { CSSProperties } from "react";

import { cn } from "./lib";

/**
 * DitherKbd — a styled `<kbd>` keycap. Pure render (no state, no effects),
 * so it stays a Server Component (no `"use client"`). Mirrors DitherKbd.vue
 * verbatim: same classes, same `border-bottom-width: 2px` inline style.
 */
export interface DitherKbdProps {
  children: React.ReactNode;
  class?: string;
}

export function DitherKbd({ children, class: className }: DitherKbdProps) {
  return (
    <kbd
      className={cn(
        "rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground",
        className,
      )}
      style={{ borderBottomWidth: "2px" } as CSSProperties}
    >
      {children}
    </kbd>
  );
}
