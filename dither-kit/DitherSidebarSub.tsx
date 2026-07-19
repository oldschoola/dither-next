"use client";

import { useId } from "react";

import { useSidebar } from "./sidebar-context";

export interface DitherSidebarSubProps {
  label: string;
  /** Open state (v-model). */
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  /** Icon slot (left of the label). */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * DitherSidebarSub — collapsible sub-menu: a parent row plus indented children
 * behind a rail. Verbatim port of DitherSidebarSub.vue.
 *
 * `value`/`onValueChange` is the controlled contract (Vue `modelValue` +
 * `update:modelValue`, guide §4). On the icon rail only the parent icon
 * remains (children need the width). Consumes `SidebarContext` via
 * `useSidebar()` (guide §3). The expand/collapse uses the grid-rows 1fr/0fr
 * CSS transition (guide §6) — no JS height measurement.
 */
export function DitherSidebarSub({
  label,
  value = false,
  onValueChange,
  icon,
  children,
}: DitherSidebarSubProps) {
  const { collapsed, compact } = useSidebar();
  const id = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={value}
        aria-controls={id}
        title={collapsed ? label : undefined}
        className={[
          "flex w-full items-center rounded-md text-left font-mono text-muted-foreground transition-colors hover:bg-card/60 hover:text-foreground",
          compact ? "h-7 gap-2 px-2 text-[11px]" : "h-8 gap-2.5 px-2.5 text-[12px]",
        ].join(" ")}
        onClick={() => onValueChange?.(!value)}
      >
        <span className="grid size-4 shrink-0 place-items-center" aria-hidden="true">
          {icon ?? <span className="size-1.5 rounded-[1px] bg-current opacity-70" />}
        </span>
        {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
        {!collapsed ? (
          <span
            aria-hidden="true"
            className={[
              "text-[11px] transition-transform duration-200 motion-reduce:transition-none",
              value ? "rotate-90" : "",
            ].join(" ")}
          >
            ›
          </span>
        ) : null}
      </button>
      {!collapsed ? (
        <div
          id={id}
          className="grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none"
          style={{ gridTemplateRows: value ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden" inert={!value}>
            <div className="ml-4.5 grid gap-0.5 border-l border-border/60 py-0.5 pl-1.5">
              {children}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
