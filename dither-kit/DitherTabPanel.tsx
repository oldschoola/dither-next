"use client";

import { useContext } from "react";

import { cn } from "./lib";
import { TabsContext } from "./DitherTabs";

/**
 * DitherTabPanel — the panel half of the tabs pattern. Id-linked to its tab
 * via the `TabsContext` (provided by `DitherTabs`), and kept MOUNTED with a
 * `hidden` toggle so canvas-heavy content does not repaint on every switch
 * (the Vue kit uses `v-show`; guide §5 maps `v-show` → `hidden` attribute).
 */
export interface DitherTabPanelProps {
  value: string;
  class?: string;
  children?: React.ReactNode;
}

export function DitherTabPanel({ value, class: className, children }: DitherTabPanelProps) {
  const ctx = useContext(TabsContext);
  const active = ctx?.active === value;

  return (
    <div
      id={ctx ? `${ctx.idBase}-panel-${value}` : undefined}
      role="tabpanel"
      aria-labelledby={ctx ? `${ctx.idBase}-tab-${value}` : undefined}
      hidden={!active}
      className={cn(className)}
    >
      {children}
    </div>
  );
}
