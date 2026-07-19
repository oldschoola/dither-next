"use client";

import type { ComponentType } from "react";
import * as kit from "@dither-kit";
import { patchArtboard, selectLayer, useEditor } from "@/entities/editor";
import { componentEntry, type ScreenModel } from "@/entities/widget";
import { cn } from "@/shared/lib";

export interface ScreenRendererProps {
  screen: ScreenModel;
  artboardId: string;
}

const JUSTIFY: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};
const ALIGN: Record<string, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

/** Immutably update a cell's live model value through the editor store. The
 *  Vue SFC mutated `cell.model` directly on the reactive widget; the React
 *  store is immutable, so we patch the owning artboard (guide §11). */
function updateModel(artboardId: string, cellId: string, value: unknown): void {
  patchArtboard(artboardId, (a) => {
    if (!a.widget || a.widget.kind !== "screen") return;
    for (const row of a.widget.rows) {
      for (const c of row.cells) {
        if (c.id === cellId) {
          c.model = value;
          return;
        }
      }
    }
  });
}

/**
 * ScreenRenderer — composed rows of registry components. Verbatim port of
 * `src/widgets/widget-renderer/ScreenRenderer.vue`. Each cell resolves its
 * kit component by export name and passes mapped props; v-model cells bind
 * `value`/`onChange` (the kit's React contract). Pointer-down on a row or
 * cell selects that layer; a ring marks the selection.
 */
export function ScreenRenderer({ screen, artboardId }: ScreenRendererProps) {
  const selectedLayerId = useEditor((s) => s.selectedLayerId);

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      style={{ gap: `${screen.gap}px`, padding: `${screen.padding}px` }}
    >
      {screen.rows.map((row) => {
        const rowId = `${artboardId}:row:${row.id}`;
        const rowSelected = selectedLayerId === rowId;
        return (
          <div
            key={row.id}
            className={cn(
              "flex min-h-6 rounded-sm",
              ALIGN[row.align],
              JUSTIFY[row.justify],
              rowSelected && "ring-1 ring-accent/60",
            )}
            style={{ gap: `${row.gap}px` }}
            onPointerDown={(e) => {
              e.stopPropagation();
              selectLayer(rowId);
            }}
          >
            {row.cells.map((cell) => {
              const id = `${artboardId}:cell:${cell.id}`;
              const selected = selectedLayerId === id;
              const Comp = (kit as unknown as Record<string, ComponentType<any>>)[cell.is];
              if (!Comp) return null;
              const entry = componentEntry(cell.is);
              const cellProps = entry?.mapProps ? entry.mapProps(cell.props) : cell.props;
              const withModel = !!entry?.vmodel
                ? { value: cell.model, onChange: (v: unknown) => updateModel(artboardId, cell.id, v) }
                : {};
              return (
                <div
                  key={cell.id}
                  className={cn(
                    "rounded-sm",
                    cell.grow && "flex-1 min-w-0",
                    selected && "ring-1 ring-accent",
                  )}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    selectLayer(id);
                  }}
                >
                  <Comp {...cellProps} {...withModel} class={cn(cell.grow && "w-full")}>
                    {cell.slotText != null ? cell.slotText : undefined}
                  </Comp>
                </div>
              );
            })}
            {row.cells.length === 0 ? (
              <span className="px-1 text-[10px] text-muted-foreground/50">
                empty row — add a component in the inspector
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
