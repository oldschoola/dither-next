"use client";

import { useMemo } from "react";

import { DitherGradient } from "./DitherGradient";
import { cn } from "./lib";
import { SidebarContext, type SidebarValue } from "./sidebar-context";
import type { PixelColor } from "./pixel";

export type SidebarVariant = "default" | "floating" | "inset" | "washed";
export type SidebarCollapse = "rail" | "hide" | "none";
export type SidebarDensity = "default" | "compact";

export interface DitherSidebarProps {
  /** Collapsed state (v-model). Meaning depends on `collapse` mode. */
  value?: boolean;
  label?: string;
  /** default: edge panel · floating: detached card · inset: bare · washed: dither gradient chrome. */
  variant?: SidebarVariant;
  /** Which edge it sits on — flips the border. */
  side?: "left" | "right";
  /** rail: folds to icons · hide: folds away entirely · none: no toggle. */
  collapse?: SidebarCollapse;
  /** compact tightens rows — dense trees, inspector panels. */
  density?: SidebarDensity;
  /** Hide the built-in rail toggle (permanent rail: collapse="rail" + value={true}). */
  toggle?: boolean;
  /** Wash color for variant="washed". */
  washColor?: PixelColor;
  className?: string;
  onValueChange?: (value: boolean) => void;
  /** Header slot (above the nav). */
  header?: React.ReactNode;
  /** Footer slot (below the nav). */
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * DitherSidebar — collapsible sidebar shell. Verbatim port of DitherSidebar.vue.
 *
 * `value`/`onValueChange` is the controlled contract (Vue `modelValue` +
 * `update:modelValue`, guide §4). Provides `SidebarContext` (collapsed +
 * compact) to descendants via `<SidebarContext value={...}>` (guide §3) — the
 * Vue kit's two `provide(SIDEBAR_COLLAPSED)` / `provide(SIDEBAR_COMPACT)` keys
 * collapse to one context value.
 *
 * Items only fold labels in rail mode — a hidden sidebar keeps full labels
 * (matching the Vue `railCollapsed` computed). The `washed` variant paints a
 * `DitherGradient` chrome behind the content (cross-group import,
 * `./DitherGradient`, Standalone group).
 */
export function DitherSidebar({
  value = false,
  label = "Sidebar",
  variant = "default",
  side = "left",
  collapse = "rail",
  density = "default",
  toggle = true,
  washColor = "blue",
  className,
  onValueChange,
  header,
  footer,
  children,
}: DitherSidebarProps) {
  // Items only fold labels in rail mode — a hidden sidebar keeps full labels.
  const railCollapsed = collapse === "rail" && value;
  const hidden = collapse === "hide" && value;

  const ctxValue = useMemo<SidebarValue>(
    () => ({ collapsed: railCollapsed, compact: density === "compact" }),
    [railCollapsed, density],
  );

  const width = hidden
    ? "w-0 overflow-hidden border-transparent p-0"
    : railCollapsed
      ? "w-14"
      : "w-56";

  const chrome = useMemo(() => {
    if (variant === "floating")
      return "m-2 h-[calc(100%-1rem)] rounded-lg border border-border/60 bg-card/50";
    if (variant === "inset") return "bg-transparent";
    const edge = side === "right" ? "border-l" : "border-r";
    if (variant === "washed")
      return `relative isolate overflow-hidden ${edge} border-border/60`;
    return `${edge} border-border/60 bg-background/40`;
  }, [variant, side]);

  return (
    <SidebarContext value={ctxValue}>
      <aside
        aria-label={label}
        className={cn(
          "flex h-full shrink-0 flex-col p-2 transition-[width] duration-200 motion-reduce:transition-none",
          chrome,
          width,
          className,
        )}
      >
        {variant === "washed" && !hidden ? (
          <DitherGradient
            from={washColor}
            to="transparent"
            direction="up"
            opacity={0.12}
            cell={4}
            className="-z-10"
          />
        ) : null}
        {header}
        <nav className="mt-2 grid min-h-0 flex-1 content-start gap-0.5 overflow-y-auto">
          {children}
        </nav>
        {footer}
        {collapse === "rail" && toggle ? (
          <button
            type="button"
            className="mt-2 flex h-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!railCollapsed}
            onClick={() => onValueChange?.(!value)}
          >
            <span className="text-[13px]" aria-hidden="true">
              {railCollapsed
                ? side === "right"
                  ? "‹"
                  : "›"
                : side === "right"
                  ? "›"
                  : "‹"}
            </span>
          </button>
        ) : null}
      </aside>
    </SidebarContext>
  );
}
