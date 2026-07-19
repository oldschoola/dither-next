"use client";

import { useMemo, useRef } from "react";
import { cssColor } from "@dither-kit";
import { patchSelectedChart, replay, setDataOpen, useEditor } from "@/entities/editor";
import {
  addRow,
  addSeries,
  importCsv,
  LABEL_KEY,
  removeRow,
  renamePieSlice,
} from "@/entities/chart";
import { familyOf } from "@/shared/config";
/**
 * DataEditor — the Studio bottom data drawer. Verbatim port of
 * `src/widgets/data-editor/DataEditor.vue` (CONVERSION-GUIDE.md §11).
 *
 * Slides up under the canvas when `editor.dataOpen` is true and the selected
 * artboard is a chart frame (not a widget). Header carries the import-CSV,
 * +series (cartesian/radar only) and +row affordances. The body is an inline
 * table of the chart's rows: pie rows show a name field + single value;
 * cartesian/radar rows show the label field plus one numeric input per
 * visible series (series colour swatch in the header).
 *
 * Every mutation routes through the immutable editor store. The Vue SFC
 * called `addRow(chart)` / `addSeries(chart)` / `removeRow(chart, i)` /
 * `renamePieSlice(chart, i, v)` / `importCsv(chart, text)` directly against
 * the reactive chart; the React producers here receive a deep clone from
 * `patchSelectedChart`, so the in-place mutations are safe and emit once.
 * CSV import and pie rename additionally call `replay()` to refresh the
 * derived renderer state (matches the Vue `onCsvFile`/`onPieName` callsites).
 */
export function DataEditor() {
  // Select referentially-stable slices: the whole artboards array (replaced
  // only on mutation) and primitive ids. Derive `ab` / `chart` via useMemo
  // so derived values stay stable across unrelated emits — same pattern as
  // Inspector/LayerTree.
  const artboards = useEditor((s) => s.artboards);
  const selectedArtboardId = useEditor((s) => s.selectedArtboardId);
  const dataOpen = useEditor((s) => s.dataOpen);

  const ab = useMemo(
    () => artboards.find((a) => a.id === selectedArtboardId) ?? null,
    [artboards, selectedArtboardId],
  );
  const chart = ab?.chart ?? null;
  const isChartFrame = !!ab && !ab.widget;

  const fam = chart ? familyOf(chart.type) : "cartesian";
  const labelKey = LABEL_KEY[fam];
  const columns = useMemo(
    () => (fam === "pie" ? [] : chart?.series.filter((s) => s.on) ?? []),
    [fam, chart?.series],
  );

  const csvRef = useRef<HTMLInputElement | null>(null);

  if (!dataOpen || !chart || !isChartFrame) return null;

  function onPieName(index: number, value: string) {
    patchSelectedChart((c) => {
      renamePieSlice(c, index, value);
    });
    replay();
  }

  async function onCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (file) {
      const text = await file.text();
      patchSelectedChart((c) => {
        importCsv(c, text);
      });
      replay();
    }
    input.value = "";
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 max-h-64 border-t border-border bg-card/95 backdrop-blur">
      <div className="flex h-9 items-center justify-between border-b border-border/60 px-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Data
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Replace the data from a CSV file (first column = labels)"
            className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => csvRef.current?.click()}
          >
            import CSV
          </button>
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv"
            name="import-csv"
            className="hidden"
            onChange={onCsvFile}
          />
          {fam !== "pie" && (
            <button
              type="button"
              className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => patchSelectedChart((c) => { addSeries(c); })}
            >
              + series
            </button>
          )}
          <button
            type="button"
            className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => patchSelectedChart((c) => { addRow(c); })}
          >
            + row
          </button>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            aria-label="Close data editor"
            onClick={() => setDataOpen(false)}
          >
            ×
          </button>
        </div>
      </div>

      <div className="max-h-[220px] overflow-auto p-2">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-2 py-1 font-medium">{labelKey}</th>
              {fam === "pie" && <th className="px-2 py-1 font-medium">value</th>}
              {columns.map((s) => (
                <th key={s.key} className="px-2 py-1 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-[2px]"
                      style={{ backgroundColor: cssColor(s.color) }}
                    />
                    {s.label}
                  </span>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, i) => (
              <tr key={i} className="border-t border-border/40">
                <td className="px-1 py-0.5">
                  {fam === "pie" ? (
                    <input
                      value={(row.name as string) ?? ""}
                      type="text"
                      name={`row-${i}-name`}
                      autoComplete="off"
                      className="w-full min-w-24 rounded border border-transparent bg-transparent px-1 py-0.5 text-foreground outline-none hover:border-border focus:border-accent/60"
                      onChange={(e) => onPieName(i, e.target.value)}
                    />
                  ) : (
                    <input
                      value={(row[labelKey] as string) ?? ""}
                      type="text"
                      name={`row-${i}-label`}
                      autoComplete="off"
                      className="w-full min-w-24 rounded border border-transparent bg-transparent px-1 py-0.5 text-foreground outline-none hover:border-border focus:border-accent/60"
                      onChange={(e) =>
                        patchSelectedChart((c) => {
                          c.rows[i][labelKey] = e.target.value;
                        })
                      }
                    />
                  )}
                </td>
                {fam === "pie" && (
                  <td className="px-1 py-0.5">
                    <input
                      value={(row.value as number) ?? 0}
                      type="number"
                      name={`row-${i}-value`}
                      className="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 tabular-nums text-foreground outline-none [appearance:textfield] hover:border-border focus:border-accent/60 [&::-webkit-inner-spin-button]:appearance-none"
                      onChange={(e) =>
                        patchSelectedChart((c) => {
                          c.rows[i].value = Number(e.target.value);
                        })
                      }
                    />
                  </td>
                )}
                {columns.map((s) => (
                  <td key={s.key} className="px-1 py-0.5">
                    <input
                      value={(row[s.key] as number) ?? 0}
                      type="number"
                      name={`row-${i}-${s.key}`}
                      className="w-20 rounded border border-transparent bg-transparent px-1 py-0.5 tabular-nums text-foreground outline-none [appearance:textfield] hover:border-border focus:border-accent/60 [&::-webkit-inner-spin-button]:appearance-none"
                      onChange={(e) =>
                        patchSelectedChart((c) => {
                          c.rows[i][s.key] = Number(e.target.value);
                        })
                      }
                    />
                  </td>
                ))}
                <td className="px-1 text-right">
                  <button
                    type="button"
                    className="rounded px-1 text-muted-foreground/60 transition-colors hover:text-red-400"
                    aria-label={`Delete row ${i + 1}`}
                    onClick={() =>
                      patchSelectedChart((c) => {
                        removeRow(c, i);
                      })
                    }
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
