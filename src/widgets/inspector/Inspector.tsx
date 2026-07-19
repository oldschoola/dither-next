"use client";

import { useMemo, useRef, useState } from "react";
import { colorToHex, patternFromImage, type VariantInput } from "@dither-kit";
import {
  patchSelectedArtboard,
  patchSelectedChart,
  replay,
  selectLayer,
  setSelectedType,
  useEditor,
} from "@/entities/editor";
import {
  addScreenRow,
  COMPONENT_REGISTRY,
  componentEntry,
  createCell,
  findCell,
  findRow,
  moveCell,
  moveScreenRow,
  removeCell,
  removeScreenRow,
  type ScreenCell,
  type ScreenRow,
} from "@/entities/widget";
import type { Artboard } from "@/entities/artboard";
import { layersOf, type ChartModel, type Layer, type SeriesRow } from "@/entities/chart";
import type {
  AvatarModel,
  ButtonModel,
  ComponentModel,
  GradientModel,
  ImageModel,
  ScreenModel,
} from "@/entities/widget";
import { CHART_TYPES, EASING_NAMES, familyOf, STACKS } from "@/shared/config";
import {
  BezierEditor,
  BloomField,
  ColorField,
  NumberField,
  Segmented,
  TextureField,
  Toggle,
} from "@/shared/ui";
import { AvatarDrawGrid } from "./AvatarDrawGrid";
import { ComponentPropsPanel } from "./ComponentPropsPanel";

/**
 * Inspector — the Studio properties panel. Verbatim port of
 * `src/widgets/inspector/Inspector.vue` (CONVERSION-GUIDE.md §11).
 *
 * Reads the selected artboard, its chart, the selected layer, and renders a
 * different panel per layer kind: root (frame geometry + chart style +
 * animation + seed + margins + bespoke widget builders), series, pie, grid,
 * xAxis, yAxis, legend, tooltip, and the screen row/cell editors.
 *
 * Every mutation routes through the immutable editor store:
 *   - chart fields → `patchSelectedChart(c => { ... })`
 *   - artboard / widget / screen fields → `patchSelectedArtboard(a => { ... })`
 * The Vue SFC assigned `chart.bloom = v` etc. directly; the producers here
 * run against a deep clone the store hands them.
 */

const EASING_CHOICES = [...EASING_NAMES, "custom"] as const;
const DOT_VARIANTS = ["border", "colored-border", "filled"] as const;
const MIRRORS = ["auto", "horizontal", "vertical"] as const;
const AVATAR_SOURCES = ["seed", "draw", "image"] as const;
const BUTTON_VARIANTS = ["gradient", "dotted", "hatched", "solid"] as const;
const GRAD_DIRS = ["up", "down", "left", "right"] as const;
const ROW_ALIGNS = ["start", "center", "end", "stretch"] as const;
const ROW_JUSTIFY = ["start", "center", "end", "between"] as const;

// Seed bezier curves for each easing preset so switching to "custom" opens
// the curve editor on the equivalent shape (seamless transition).
const SEED_BEZIER: Record<string, [number, number, number, number]> = {
  linear: [0.25, 0.25, 0.75, 0.75],
  "ease-out": [0.33, 1, 0.68, 1],
  "ease-in-out": [0.65, 0, 0.35, 1],
};

/** PixelColor may be a legacy hue number — coerce for the ColorField. */
const asFieldColor = (c: unknown): string =>
  typeof c === "number" ? colorToHex(c) : (c as string);

export function Inspector() {
  // Select referentially-stable slices: the whole artboards array (replaced
  // only on mutation), and primitive ids. Derive `ab` / `chart` / `layers`
  // / `layer` with useMemo so child props stay stable across unrelated emits
  // — same pattern as LayerTree.
  const artboards = useEditor((s) => s.artboards);
  const selectedArtboardId = useEditor((s) => s.selectedArtboardId);
  const selectedLayerId = useEditor((s) => s.selectedLayerId);

  const ab = useMemo(
    () => artboards.find((a) => a.id === selectedArtboardId) ?? null,
    [artboards, selectedArtboardId],
  );
  const chart = ab?.chart ?? null;

  const layers = useMemo(
    () => (ab ? layersOf(ab.chart, ab.id) : []),
    [ab],
  );
  const layer = useMemo(
    () => layers.find((l) => l.id === selectedLayerId),
    [layers, selectedLayerId],
  );
  const kind = layer?.kind ?? "root";
  const fam = chart ? familyOf(chart.type) : "cartesian";

  const series = useMemo<SeriesRow | undefined>(
    () =>
      layer?.seriesKey
        ? chart?.series.find((s) => s.key === layer.seriesKey)
        : undefined,
    [layer, chart],
  );

  // --- locked state + unlock ----------------------------------------------
  const locked = useMemo(() => {
    const c = chart;
    const a = ab;
    if (!c || !a) return false;
    switch (kind) {
      case "root": return a.locked;
      case "series": return series?.locked ?? false;
      case "grid": return c.grid.locked;
      case "xAxis": return c.xAxis.locked;
      case "yAxis": return c.yAxis.locked;
      case "legend": return c.legend.locked;
      case "tooltip": return c.tooltip.locked;
      default: return false;
    }
  }, [chart, ab, kind, series]);

  function unlock() {
    if (kind === "root") {
      patchSelectedArtboard((a) => {
        a.locked = false;
      });
      return;
    }
    patchSelectedChart((c) => {
      switch (kind) {
        case "series": {
          if (layer?.seriesKey) {
            const s = c.series.find((x) => x.key === layer.seriesKey);
            if (s) s.locked = false;
          }
          break;
        }
        case "grid": c.grid.locked = false; break;
        case "xAxis": c.xAxis.locked = false; break;
        case "yAxis": c.yAxis.locked = false; break;
        case "legend": c.legend.locked = false; break;
        case "tooltip": c.tooltip.locked = false; break;
      }
    });
  }

  // --- easing (three presets + custom bezier) -----------------------------
  const easingChoice = useMemo<string>(() => {
    const e = chart?.easing ?? "ease-in-out";
    return typeof e === "string" ? e : "custom";
  }, [chart?.easing]);

  const bezierPoints = useMemo<[number, number, number, number]>(() => {
    const e = chart?.easing;
    return typeof e === "object" && e
      ? [e[0], e[1], e[2], e[3]]
      : SEED_BEZIER["ease-in-out"];
  }, [chart?.easing]);

  function setEasingChoice(v: string | number) {
    if (!chart) return;
    patchSelectedChart((c) => {
      if (v === "custom") {
        const seed = SEED_BEZIER[easingChoice] ?? SEED_BEZIER["ease-in-out"];
        c.easing = [seed[0], seed[1], seed[2], seed[3]];
      } else {
        c.easing = v as (typeof EASING_NAMES)[number];
      }
    });
  }

  // --- seed / effect -------------------------------------------------------
  const rollSeed = () =>
    patchSelectedChart((c) => {
      c.seed = Math.floor(Math.random() * 1_000_000);
    });
  const clearSeed = () =>
    patchSelectedChart((c) => {
      c.seed = undefined;
    });
  const rollEffect = () =>
    patchSelectedChart((c) => {
      c.effect = Math.floor(Math.random() * 1_000_000);
    });
  const clearEffect = () =>
    patchSelectedChart((c) => {
      c.effect = undefined;
    });

  // --- widget frame accessors --------------------------------------------
  const avatar = ab?.widget?.kind === "avatar" ? ab.widget : null;
  const button = ab?.widget?.kind === "button" ? ab.widget : null;
  const gradient = ab?.widget?.kind === "gradient" ? ab.widget : null;
  const image = ab?.widget?.kind === "image" ? ab.widget : null;
  const component = ab?.widget?.kind === "component" ? ab.widget : null;
  const componentSpec = component ? componentEntry(component.is) : undefined;
  const screen = ab?.widget?.kind === "screen" ? ab.widget : null;

  // --- screen row/cell selection parsed from the layer id ----------------
  const screenSel = useMemo(() => {
    if (!screen) return null;
    const rowMatch = selectedLayerId.match(/:row:(.+)$/);
    if (rowMatch) {
      return {
        kind: "row" as const,
        row: findRow(screen, rowMatch[1]),
      };
    }
    const cellMatch = selectedLayerId.match(/:cell:(.+)$/);
    if (cellMatch) {
      const hit = findCell(screen, cellMatch[1]);
      return hit ? { kind: "cell" as const, ...hit } : null;
    }
    return null;
  }, [screen, selectedLayerId]);

  function addCellFromPicker(row: ScreenRow, e: React.ChangeEvent<HTMLSelectElement>) {
    const is = e.target.value;
    const entry = componentEntry(is);
    e.target.value = "";
    if (!entry) return;
    // Build the cell before the patch so we know its id and can select it
    // right after the store emit (selectLayer needs the new cell id).
    const cell = createCell(entry);
    patchSelectedArtboard((a) => {
      if (a.widget?.kind !== "screen") return;
      const r = findRow(a.widget, row.id);
      if (r) r.cells.push(cell);
    });
    selectLayer(`${selectedArtboardId}:cell:${cell.id}`);
  }

  // --- avatar source / image upload --------------------------------------
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarImageError, setAvatarImageError] = useState(false);

  function setAvatarSource(v: string | number) {
    patchSelectedArtboard((a) => {
      if (a.widget?.kind !== "avatar") return;
      a.widget.source = v as (typeof AVATAR_SOURCES)[number];
      if (v === "seed") a.widget.pattern = null;
      if (v === "image" && a.widget.imageSrc) {
        void deriveAvatarImage(a.widget);
      }
    });
  }

  /** Dither the image into the grid; keeps the previous pattern on failure. */
  async function deriveAvatarImage(a: AvatarModel) {
    if (a.source !== "image" || !a.imageSrc) return;
    const result = await patternFromImage(a.imageSrc, a.grid, a.imageThreshold, a.imageInvert);
    setAvatarImageError(!result);
    if (result) {
      patchSelectedArtboard((art) => {
        if (art.widget?.kind !== "avatar") return;
        art.widget.pattern = {
          on: result.on.map((b) => (b ? 1 : 0)),
          density: result.density.map((d) => Math.round(d * 100) / 100),
        };
      });
    }
  }

  function onAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (file) {
      // Data URI (not object URL) so the image survives save/reload/export.
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          patchSelectedArtboard((a) => {
            if (a.widget?.kind !== "avatar") return;
            a.widget.imageSrc = reader.result as string;
            void deriveAvatarImage(a.widget);
          });
        }
      };
      reader.readAsDataURL(file);
    }
    input.value = "";
  }

  // --- pie variant (broadcast across all slices) -------------------------
  const pieVariant = useMemo<VariantInput>(
    () => chart?.series[0]?.variant ?? "gradient",
    [chart?.series],
  );
  function setPieVariant(v: VariantInput) {
    patchSelectedChart((c) => {
      c.series.forEach((s) => (s.variant = v));
    });
  }

  // --- component / screen-cell prop wiring --------------------------------
  function patchComponentProps(key: string, value: unknown) {
    patchSelectedArtboard((a) => {
      if (a.widget?.kind === "component") a.widget.props[key] = value;
    });
  }
  function patchComponentSlotText(value: string) {
    patchSelectedArtboard((a) => {
      if (a.widget?.kind === "component") a.widget.slotText = value;
    });
  }
  function patchCellProps(cellId: string, key: string, value: unknown) {
    patchSelectedArtboard((a) => {
      if (a.widget?.kind !== "screen") return;
      const hit = findCell(a.widget, cellId);
      if (hit) hit.cell.props[key] = value;
    });
  }
  function patchCellSlotText(cellId: string, value: string) {
    patchSelectedArtboard((a) => {
      if (a.widget?.kind !== "screen") return;
      const hit = findCell(a.widget, cellId);
      if (hit) hit.cell.slotText = value;
    });
  }

  // --- derived: which bespoke builder to show -----------------------------
  // Mirrors the Vue template's chained v-if/v-else-if over the widget kinds.
  const inputClass =
    "w-full rounded-md border border-border bg-background/60 px-2 py-1 text-xs text-foreground outline-none focus:border-accent/60";

  if (!chart || !ab) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
        Select an artboard to edit its properties.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3">
        <span className="truncate text-[13px] font-medium text-foreground">
          {ab.widget ? ab.name : (layer?.label ?? "Inspector")}
        </span>
        <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {ab.widget?.kind ?? kind}
        </span>
      </div>

      {locked ? (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <svg
              viewBox="0 0 24 24"
              className="size-3.5 text-accent"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Locked
          </span>
          <button
            type="button"
            className="rounded border border-border px-1.5 py-0.5 text-foreground transition-colors hover:bg-background"
            onClick={unlock}
          >
            Unlock
          </button>
        </div>
      ) : null}

      <div
        className={`flex flex-col gap-5 overflow-y-auto p-4 ${locked ? "pointer-events-none select-none opacity-50" : ""}`}
      >
        {kind === "root" ? (
          <RootPanel
            ab={ab}
            chart={chart}
            fam={fam}
            layer={layer}
            avatar={avatar}
            button={button}
            gradient={gradient}
            image={image}
            component={component}
            componentSpec={componentSpec}
            screen={screen}
            screenSel={screenSel}
            easingChoice={easingChoice}
            bezierPoints={bezierPoints}
            setEasingChoice={setEasingChoice}
            rollSeed={rollSeed}
            clearSeed={clearSeed}
            rollEffect={rollEffect}
            clearEffect={clearEffect}
            setAvatarSource={setAvatarSource}
            avatarFileInputRef={avatarFileInputRef}
            avatarImageError={avatarImageError}
            onAvatarFile={onAvatarFile}
            deriveAvatarImage={deriveAvatarImage}
            addCellFromPicker={addCellFromPicker}
            patchComponentProps={patchComponentProps}
            patchComponentSlotText={patchComponentSlotText}
            patchCellProps={patchCellProps}
            patchCellSlotText={patchCellSlotText}
            inputClass={inputClass}
          />
        ) : null}

        {kind === "series" && series ? (
          <SeriesPanel
            chart={chart}
            series={series}
            fam={fam}
            layer={layer}
            inputClass={inputClass}
          />
        ) : null}

        {kind === "pie" ? (
          <div className="flex flex-col gap-3">
            <TextureField value={pieVariant} onChange={setPieVariant} />
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">radius</span>
              <input
                type="range"
                name="pie-radius"
                min={0}
                max={0.85}
                step={0.05}
                value={chart.innerRadius}
                className="flex-1 accent-foreground"
                onChange={(e) =>
                  patchSelectedChart((c) => {
                    c.innerRadius = Number(e.target.value);
                  })
                }
              />
              <span className="w-8 tabular-nums text-foreground">
                {chart.innerRadius.toFixed(2)}
              </span>
            </label>
          </div>
        ) : null}

        {kind === "grid" ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <Toggle
                value={chart.grid.horizontal}
                label="horizontal"
                onChange={(v) =>
                  patchSelectedChart((c) => {
                    c.grid.horizontal = v;
                  })
                }
              />
              <Toggle
                value={chart.grid.vertical}
                label="vertical"
                onChange={(v) =>
                  patchSelectedChart((c) => {
                    c.grid.vertical = v;
                  })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">dash</span>
              <input
                type="text"
                name="grid-dash"
                autoComplete="off"
                placeholder="3 3"
                value={chart.grid.dash}
                className={inputClass}
                onChange={(e) =>
                  patchSelectedChart((c) => {
                    c.grid.dash = e.target.value;
                  })
                }
              />
            </label>
            <NumberField
              label="lines"
              value={chart.grid.tickCount}
              min={1}
              max={12}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.grid.tickCount = v;
                })
              }
            />
          </div>
        ) : null}

        {kind === "xAxis" ? (
          <div className="flex flex-col gap-3">
            <NumberField
              label="tick gap"
              value={chart.xAxis.tickMargin}
              min={0}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.xAxis.tickMargin = v;
                })
              }
            />
            <NumberField
              label="max ticks"
              value={chart.xAxis.maxTicks}
              min={1}
              max={20}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.xAxis.maxTicks = v;
                })
              }
            />
          </div>
        ) : null}

        {kind === "yAxis" ? (
          <div className="flex flex-col gap-3">
            <NumberField
              label="ticks"
              value={chart.yAxis.tickCount}
              min={2}
              max={12}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.yAxis.tickCount = v;
                })
              }
            />
            <NumberField
              label="tick gap"
              value={chart.yAxis.tickMargin}
              min={0}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.yAxis.tickMargin = v;
                })
              }
            />
          </div>
        ) : null}

        {kind === "legend" ? (
          <div className="flex flex-col gap-3">
            <Segmented
              value={chart.legend.align}
              options={["left", "center", "right"]}
              label="align"
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.legend.align = v;
                })
              }
            />
            <Toggle
              value={chart.legend.clickable}
              label="clickable"
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.legend.clickable = v;
                })
              }
            />
          </div>
        ) : null}

        {kind === "tooltip" ? (
          <Segmented
            value={chart.tooltip.variant}
            options={["default", "frosted-glass"]}
            label="variant"
            onChange={(v) =>
              patchSelectedChart((c) => {
                c.tooltip.variant = v;
              })
            }
          />
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root panel — frame geometry, chart style, animation, seed, margins, and the
// bespoke widget builders (avatar/button/component/screen/image/gradient).
// ---------------------------------------------------------------------------

interface RootPanelProps {
  ab: Artboard;
  chart: ChartModel;
  fam: "cartesian" | "pie" | "radar";
  layer: Layer | undefined;
  avatar: AvatarModel | null;
  button: ButtonModel | null;
  gradient: GradientModel | null;
  image: ImageModel | null;
  component: ComponentModel | null;
  componentSpec: ReturnType<typeof componentEntry>;
  screen: ScreenModel | null;
  screenSel:
    | { kind: "row"; row: ScreenRow | undefined }
    | { kind: "cell"; row: ScreenRow; cell: ScreenCell }
    | null;
  easingChoice: string;
  bezierPoints: [number, number, number, number];
  setEasingChoice: (v: string | number) => void;
  rollSeed: () => void;
  clearSeed: () => void;
  rollEffect: () => void;
  clearEffect: () => void;
  setAvatarSource: (v: string | number) => void;
  avatarFileInputRef: React.RefObject<HTMLInputElement | null>;
  avatarImageError: boolean;
  onAvatarFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  deriveAvatarImage: (a: AvatarModel) => Promise<void>;
  addCellFromPicker: (row: ScreenRow, e: React.ChangeEvent<HTMLSelectElement>) => void;
  patchComponentProps: (key: string, value: unknown) => void;
  patchComponentSlotText: (value: string) => void;
  patchCellProps: (cellId: string, key: string, value: unknown) => void;
  patchCellSlotText: (cellId: string, value: string) => void;
  inputClass: string;
}

function RootPanel(props: RootPanelProps) {
  const {
    ab,
    chart,
    fam,
    avatar,
    button,
    gradient,
    image,
    component,
    componentSpec,
    screen,
    screenSel,
    easingChoice,
    bezierPoints,
    setEasingChoice,
    rollSeed,
    clearSeed,
    rollEffect,
    clearEffect,
    setAvatarSource,
    avatarFileInputRef,
    avatarImageError,
    onAvatarFile,
    deriveAvatarImage,
    addCellFromPicker,
    patchComponentProps,
    patchComponentSlotText,
    patchCellProps,
    patchCellSlotText,
    inputClass,
  } = props;

  return (
    <>
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="w-14 shrink-0">name</span>
        <input
          type="text"
          name="artboard-name"
          autoComplete="off"
          value={ab.name}
          className={inputClass}
          onChange={(e) =>
            patchSelectedArtboard((a) => {
              a.name = e.target.value;
            })
          }
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="X"
          value={ab.x}
          onChange={(v) =>
            patchSelectedArtboard((a) => {
              a.x = v;
            })
          }
        />
        <NumberField
          label="Y"
          value={ab.y}
          onChange={(v) =>
            patchSelectedArtboard((a) => {
              a.y = v;
            })
          }
        />
        <NumberField
          label="W"
          value={ab.w}
          min={260}
          onChange={(v) =>
            patchSelectedArtboard((a) => {
              a.w = v;
            })
          }
        />
        <NumberField
          label="H"
          value={ab.h}
          min={200}
          onChange={(v) =>
            patchSelectedArtboard((a) => {
              a.h = v;
            })
          }
        />
      </div>

      {!ab.widget ? (
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            type
          </p>
          <div className="flex flex-wrap gap-0.5 rounded-md border border-border bg-background/60 p-0.5">
            {CHART_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`rounded-[5px] px-2.5 py-1 text-xs capitalize leading-none transition-colors ${
                  chart.type === t
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setSelectedType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!ab.widget ? (
        <section className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            style
          </p>
          <BloomField
            value={chart.bloom}
            onChange={(v) =>
              patchSelectedChart((c) => {
                // BloomField emits BloomInput (preset | config | number seed);
                // the chart holds a preset-or-config. The number path is the
                // bloom-from-seed flow, which the chart doesn't use — cast
                // back to the chart's union (matches the Vue v-model binding).
                c.bloom = v as (typeof c.bloom);
              })
            }
          />
          {fam === "cartesian" ? (
            <Segmented
              value={chart.stackType}
              options={STACKS}
              label="stack"
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.stackType = v;
                })
              }
            />
          ) : null}
          {chart.type === "pie" ? (
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">radius</span>
              <input
                type="range"
                name="pie-radius"
                min={0}
                max={0.85}
                step={0.05}
                value={chart.innerRadius}
                className="flex-1 accent-foreground"
                onChange={(e) =>
                  patchSelectedChart((c) => {
                    c.innerRadius = Number(e.target.value);
                  })
                }
              />
              <span className="w-8 tabular-nums text-foreground">
                {chart.innerRadius.toFixed(2)}
              </span>
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">pixel</span>
            <input
              type="range"
              name="cell"
              min={1}
              max={6}
              step={1}
              value={chart.cell}
              className="flex-1 accent-foreground"
              onChange={(e) =>
                patchSelectedChart((c) => {
                  c.cell = Number(e.target.value);
                })
              }
            />
            <span className="w-8 tabular-nums text-foreground">{chart.cell}px</span>
          </label>
          {chart.type === "bar" ? (
            <>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-14 shrink-0">bar gap</span>
                <input
                  type="range"
                  name="bar-gap"
                  min={0}
                  max={0.7}
                  step={0.02}
                  value={chart.barGap}
                  className="flex-1 accent-foreground"
                  onChange={(e) =>
                    patchSelectedChart((c) => {
                      c.barGap = Number(e.target.value);
                    })
                  }
                />
                <span className="w-8 tabular-nums text-foreground">
                  {chart.barGap.toFixed(2)}
                </span>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-14 shrink-0">edge</span>
                <input
                  type="range"
                  name="bar-edge"
                  min={0}
                  max={1}
                  step={0.02}
                  value={chart.barEdge}
                  className="flex-1 accent-foreground"
                  onChange={(e) =>
                    patchSelectedChart((c) => {
                      c.barEdge = Number(e.target.value);
                    })
                  }
                />
                <span className="w-8 tabular-nums text-foreground">
                  {chart.barEdge.toFixed(2)}
                </span>
              </label>
            </>
          ) : null}
          {chart.type === "line" ? (
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">glow</span>
              <input
                type="range"
                name="glow-size"
                min={0.05}
                max={0.4}
                step={0.01}
                value={chart.glowSize}
                className="flex-1 accent-foreground"
                onChange={(e) =>
                  patchSelectedChart((c) => {
                    c.glowSize = Number(e.target.value);
                  })
                }
              />
              <span className="w-8 tabular-nums text-foreground">
                {chart.glowSize.toFixed(2)}
              </span>
            </label>
          ) : null}
          {chart.type === "pie" ? (
            <>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-14 shrink-0">pop</span>
                <input
                  type="range"
                  name="pie-pop"
                  min={0}
                  max={20}
                  step={1}
                  value={chart.popOut}
                  className="flex-1 accent-foreground"
                  onChange={(e) =>
                    patchSelectedChart((c) => {
                      c.popOut = Number(e.target.value);
                    })
                  }
                />
                <span className="w-8 tabular-nums text-foreground">
                  {chart.popOut}px
                </span>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-14 shrink-0">rim</span>
                <input
                  type="range"
                  name="pie-rim"
                  min={0}
                  max={5}
                  step={0.2}
                  value={chart.rimWidth}
                  className="flex-1 accent-foreground"
                  onChange={(e) =>
                    patchSelectedChart((c) => {
                      c.rimWidth = Number(e.target.value);
                    })
                  }
                />
                <span className="w-8 tabular-nums text-foreground">
                  {chart.rimWidth.toFixed(1)}
                </span>
              </label>
            </>
          ) : null}
          {chart.type === "radar" ? (
            <>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-14 shrink-0">falloff</span>
                <input
                  type="range"
                  name="radar-falloff"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={chart.falloff}
                  className="flex-1 accent-foreground"
                  onChange={(e) =>
                    patchSelectedChart((c) => {
                      c.falloff = Number(e.target.value);
                    })
                  }
                />
                <span className="w-8 tabular-nums text-foreground">
                  {chart.falloff.toFixed(2)}
                </span>
              </label>
              <NumberField
                label="rings"
                value={chart.radarRings}
                min={1}
                max={10}
                onChange={(v) =>
                  patchSelectedChart((c) => {
                    c.radarRings = v;
                  })
                }
              />
            </>
          ) : null}
          {chart.type === "pie" ? (
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">start</span>
              <input
                type="range"
                name="pie-start"
                min={0}
                max={359}
                step={1}
                value={chart.startAngle}
                className="flex-1 accent-foreground"
                onChange={(e) =>
                  patchSelectedChart((c) => {
                    c.startAngle = Number(e.target.value);
                  })
                }
              />
              <span className="w-8 tabular-nums text-foreground">
                {chart.startAngle}°
              </span>
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">dim</span>
            <input
              type="range"
              name="dim-opacity"
              min={0}
              max={1}
              step={0.05}
              value={chart.dimOpacity}
              className="flex-1 accent-foreground"
              onChange={(e) =>
                patchSelectedChart((c) => {
                  c.dimOpacity = Number(e.target.value);
                })
              }
            />
            <span className="w-8 tabular-nums text-foreground">
              {chart.dimOpacity.toFixed(2)}
            </span>
          </label>
          {chart.hoverLift ? (
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">hover</span>
              <input
                type="range"
                name="hover-strength"
                min={0}
                max={2}
                step={0.1}
                value={chart.hoverStrength}
                className="flex-1 accent-foreground"
                onChange={(e) =>
                  patchSelectedChart((c) => {
                    c.hoverStrength = Number(e.target.value);
                  })
                }
              />
              <span className="w-8 tabular-nums text-foreground">
                {chart.hoverStrength.toFixed(1)}×
              </span>
            </label>
          ) : null}
          <div className="flex gap-4">
            {fam === "cartesian" ? (
              <Toggle
                value={chart.interactive}
                label="interactive"
                onChange={(v) =>
                  patchSelectedChart((c) => {
                    c.interactive = v;
                  })
                }
              />
            ) : null}
            {fam === "cartesian" ? (
              <Toggle
                value={chart.crosshair}
                label="crosshair"
                onChange={(v) =>
                  patchSelectedChart((c) => {
                    c.crosshair = v;
                  })
                }
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {!ab.widget ? (
        <section className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            animation
          </p>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="time"
              unit="ms"
              value={chart.animationDuration}
              min={0}
              max={4000}
              step={50}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.animationDuration = v;
                })
              }
            />
            <NumberField
              label="delay"
              unit="ms"
              value={chart.animationDelay}
              min={0}
              max={4000}
              step={50}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.animationDelay = v;
                })
              }
            />
          </div>
          <Segmented
            value={easingChoice}
            options={EASING_CHOICES}
            label="easing"
            onChange={setEasingChoice}
          />
          {easingChoice === "custom" ? (
            <BezierEditor
              value={bezierPoints}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.easing = [v[0], v[1], v[2], v[3]];
                })
              }
            />
          ) : null}
          {chart.type === "bar" ? (
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">stagger</span>
              <input
                type="range"
                name="bar-stagger"
                min={0}
                max={0.9}
                step={0.05}
                value={chart.stagger}
                className="flex-1 accent-foreground"
                onChange={(e) =>
                  patchSelectedChart((c) => {
                    c.stagger = Number(e.target.value);
                  })
                }
              />
              <span className="w-8 tabular-nums text-foreground">
                {chart.stagger.toFixed(2)}
              </span>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-0.5">
            <Toggle
              value={chart.animate}
              label="animate"
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.animate = v;
                })
              }
            />
            <Toggle
              value={chart.hoverLift}
              label="hover lift"
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.hoverLift = v;
                })
              }
            />
            {chart.type === "area" || chart.type === "line" ? (
              <Toggle
                value={chart.sparkles}
                label="sparkles"
                onChange={(v) =>
                  patchSelectedChart((c) => {
                    c.sparkles = v;
                  })
                }
              />
            ) : null}
          </div>
          {(chart.type === "area" || chart.type === "line") && chart.sparkles ? (
            <>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-14 shrink-0">stars</span>
                <input
                  type="range"
                  name="sparkle-density"
                  min={0.2}
                  max={3}
                  step={0.1}
                  value={chart.sparkleDensity}
                  className="flex-1 accent-foreground"
                  onChange={(e) =>
                    patchSelectedChart((c) => {
                      c.sparkleDensity = Number(e.target.value);
                    })
                  }
                />
                <span className="w-8 tabular-nums text-foreground">
                  {chart.sparkleDensity.toFixed(1)}×
                </span>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-14 shrink-0">wink</span>
                <input
                  type="range"
                  name="sparkle-speed"
                  min={0.2}
                  max={3}
                  step={0.1}
                  value={chart.sparkleSpeed}
                  className="flex-1 accent-foreground"
                  onChange={(e) =>
                    patchSelectedChart((c) => {
                      c.sparkleSpeed = Number(e.target.value);
                    })
                  }
                />
                <span className="w-8 tabular-nums text-foreground">
                  {chart.sparkleSpeed.toFixed(1)}×
                </span>
              </label>
            </>
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => replay()}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              replay
            </button>
          </div>
        </section>
      ) : null}

      {!ab.widget ? (
        <section className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            seed
          </p>
          <p className="text-[10px] leading-relaxed text-muted-foreground/70">
            One integer derives texture, motion, geometry and glow. Explicit
            controls above always win.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[11px] text-muted-foreground">
              master
            </span>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              onClick={rollSeed}
            >
              roll
            </button>
            <span className="flex-1 truncate text-[11px] tabular-nums text-foreground">
              {chart.seed ?? "off"}
            </span>
            {chart.seed !== undefined ? (
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                onClick={clearSeed}
              >
                clear
              </button>
            ) : null}
          </div>
          {chart.type === "area" || chart.type === "line" ? (
            <div className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[11px] text-muted-foreground">
                motion
              </span>
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                onClick={rollEffect}
              >
                roll
              </button>
              <span className="flex-1 truncate text-[11px] tabular-nums text-foreground">
                {chart.effect ?? "seed"}
              </span>
              {chart.effect !== undefined ? (
                <button
                  type="button"
                  className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  onClick={clearEffect}
                >
                  clear
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {!ab.widget && fam === "cartesian" ? (
        <section>
          <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            margins
          </p>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="top"
              value={chart.margins.top}
              min={0}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.margins.top = v;
                })
              }
            />
            <NumberField
              label="right"
              value={chart.margins.right}
              min={0}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.margins.right = v;
                })
              }
            />
            <NumberField
              label="bottom"
              value={chart.margins.bottom}
              min={0}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.margins.bottom = v;
                })
              }
            />
            <NumberField
              label="left"
              value={chart.margins.left}
              min={0}
              onChange={(v) =>
                patchSelectedChart((c) => {
                  c.margins.left = v;
                })
              }
            />
          </div>
        </section>
      ) : null}

      {/* AVATAR builder */}
      {avatar ? (
        <>
          <section className="flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              avatar
            </p>
            <Segmented
              value={avatar.source ?? "seed"}
              options={AVATAR_SOURCES}
              label="source"
              onChange={setAvatarSource}
            />
            {(avatar.source ?? "seed") === "seed" ? (
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-14 shrink-0">seed</span>
                <input
                  type="text"
                  name="avatar-seed"
                  autoComplete="off"
                  value={avatar.name}
                  className={inputClass}
                  onChange={(e) =>
                    patchSelectedArtboard((a) => {
                      if (a.widget?.kind === "avatar") a.widget.name = e.target.value;
                    })
                  }
                />
              </label>
            ) : null}
            {avatar.source === "draw" ? (
              <AvatarDrawGrid
                avatar={avatar}
                onChange={(producer) =>
                  patchSelectedArtboard((a) => {
                    if (a.widget?.kind === "avatar") producer(a.widget);
                  })
                }
              />
            ) : null}
            {avatar.source === "image" ? (
              <>
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="w-14 shrink-0">src</span>
                  <input
                    type="text"
                    name="avatar-image-src"
                    autoComplete="off"
                    placeholder="https://…"
                    value={avatar.imageSrc}
                    className={inputClass}
                    onChange={(e) =>
                      patchSelectedArtboard((a) => {
                        if (a.widget?.kind === "avatar") a.widget.imageSrc = e.target.value;
                      })
                    }
                    onBlur={() => deriveAvatarImage(avatar)}
                  />
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => avatarFileInputRef.current?.click()}
                  >
                    upload…
                  </button>
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    name="avatar-image-file"
                    className="hidden"
                    onChange={onAvatarFile}
                  />
                  {avatarImageError ? (
                    <span className="text-[10px] text-red-400">
                      couldn&apos;t read that image
                    </span>
                  ) : null}
                </div>
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="w-14 shrink-0">cutoff</span>
                  <input
                    type="range"
                    name="avatar-threshold"
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={avatar.imageThreshold}
                    className="flex-1 accent-foreground"
                    onChange={(e) =>
                      patchSelectedArtboard((a) => {
                        if (a.widget?.kind === "avatar") {
                          a.widget.imageThreshold = Number(e.target.value);
                          void deriveAvatarImage(a.widget);
                        }
                      })
                    }
                  />
                  <span className="w-8 tabular-nums text-foreground">
                    {avatar.imageThreshold.toFixed(2)}
                  </span>
                </label>
                <Toggle
                  value={avatar.imageInvert}
                  label="invert (dark images)"
                  onChange={(v) => {
                    patchSelectedArtboard((a) => {
                      if (a.widget?.kind === "avatar") a.widget.imageInvert = v;
                    });
                    void deriveAvatarImage(avatar);
                  }}
                />
              </>
            ) : null}
            <Segmented
              value={avatar.mirror}
              options={MIRRORS}
              label="mirror"
              onChange={(v) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "avatar")
                    a.widget.mirror = v as (typeof MIRRORS)[number];
                })
              }
            />
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">grid</span>
              <input
                type="range"
                name="avatar-grid"
                min={4}
                max={16}
                step={2}
                value={avatar.grid}
                className="flex-1 accent-foreground"
                onChange={(e) =>
                  patchSelectedArtboard((a) => {
                    if (a.widget?.kind === "avatar") a.widget.grid = Number(e.target.value);
                  })
                }
              />
              <span className="w-8 tabular-nums text-foreground">
                {avatar.grid}×{avatar.grid}
              </span>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">cell res</span>
              <input
                type="range"
                name="avatar-cellpx"
                min={1}
                max={8}
                step={1}
                value={avatar.cellPx}
                className="flex-1 accent-foreground"
                onChange={(e) =>
                  patchSelectedArtboard((a) => {
                    if (a.widget?.kind === "avatar") a.widget.cellPx = Number(e.target.value);
                  })
                }
              />
              <span className="w-8 tabular-nums text-foreground">{avatar.cellPx}px</span>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">density</span>
              <input
                type="range"
                name="avatar-density"
                min={-0.5}
                max={0.5}
                step={0.05}
                value={avatar.density}
                className="flex-1 accent-foreground"
                onChange={(e) =>
                  patchSelectedArtboard((a) => {
                    if (a.widget?.kind === "avatar") a.widget.density = Number(e.target.value);
                  })
                }
              />
              <span className="w-8 tabular-nums text-foreground">
                {avatar.density.toFixed(2)}
              </span>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="w-14 shrink-0">off tier</span>
              <input
                type="range"
                name="avatar-offtier"
                min={0}
                max={1}
                step={0.05}
                value={avatar.offTier}
                className="flex-1 accent-foreground"
                onChange={(e) =>
                  patchSelectedArtboard((a) => {
                    if (a.widget?.kind === "avatar") a.widget.offTier = Number(e.target.value);
                  })
                }
              />
              <span className="w-8 tabular-nums text-foreground">
                {avatar.offTier.toFixed(2)}
              </span>
            </label>
          </section>
          <section className="flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              colour
            </p>
            <Toggle
              value={avatar.autoColor}
              label="derive from seed"
              onChange={(v) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "avatar") a.widget.autoColor = v;
                })
              }
            />
            {!avatar.autoColor ? (
              <ColorField
                value={asFieldColor(avatar.color)}
                onChange={(v) =>
                  patchSelectedArtboard((a) => {
                    if (a.widget?.kind === "avatar") a.widget.color = v as never;
                  })
                }
              />
            ) : null}
            <BloomField
              value={avatar.bloom}
              onChange={(v) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "avatar") a.widget.bloom = v;
                })
              }
            />
          </section>
          <section className="flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              animation
            </p>
            <NumberField
              label="time"
              unit="ms"
              value={avatar.animationDuration}
              min={0}
              max={4000}
              step={50}
              onChange={(v) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "avatar") a.widget.animationDuration = v;
                })
              }
            />
            <div className="flex gap-4">
              <Toggle
                value={avatar.animate}
                label="animate"
                onChange={(v) =>
                  patchSelectedArtboard((a) => {
                    if (a.widget?.kind === "avatar") a.widget.animate = v;
                  })
                }
              />
              <button
                type="button"
                className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => replay()}
              >
                replay
              </button>
            </div>
          </section>
        </>
      ) : button ? (
        <section className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            button
          </p>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">label</span>
            <input
              type="text"
              name="button-label"
              autoComplete="off"
              value={button.label}
              className={inputClass}
              onChange={(e) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "button") a.widget.label = e.target.value;
                })
              }
            />
          </label>
          <Segmented
            value={button.variant}
            options={BUTTON_VARIANTS}
            label="variant"
            onChange={(v) =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind === "button")
                  a.widget.variant = v as (typeof BUTTON_VARIANTS)[number];
              })
            }
          />
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">pixel</span>
            <input
              type="range"
              name="button-cell"
              min={1}
              max={6}
              step={1}
              value={button.cell}
              className="flex-1 accent-foreground"
              onChange={(e) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "button") a.widget.cell = Number(e.target.value);
                })
              }
            />
            <span className="w-8 tabular-nums text-foreground">{button.cell}px</span>
          </label>
          <div className="text-[11px] text-muted-foreground">
            <span className="mb-1 block">colour</span>
            <ColorField
              value={asFieldColor(button.color)}
              onChange={(v) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "button") a.widget.color = v as never;
                })
              }
            />
          </div>
          <BloomField
            value={button.bloom}
            onChange={(v) =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind === "button") a.widget.bloom = v;
              })
            }
          />
        </section>
      ) : component && componentSpec ? (
        <section className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {componentSpec.label}
          </p>
          <ComponentPropsPanel
            entry={componentSpec}
            props={component.props}
            slotText={component.slotText}
            onPropChange={patchComponentProps}
            onSlotTextChange={patchComponentSlotText}
          />
        </section>
      ) : screen && screenSel?.kind === "cell" ? (
        <section className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {componentEntry(screenSel.cell.is)?.label ?? screenSel.cell.is}
          </p>
          {componentEntry(screenSel.cell.is) ? (
            <ComponentPropsPanel
              entry={componentEntry(screenSel.cell.is)!}
              props={screenSel.cell.props}
              slotText={screenSel.cell.slotText}
              onPropChange={(key, value) =>
                patchCellProps(screenSel.cell.id, key, value)
              }
              onSlotTextChange={(value) =>
                patchCellSlotText(screenSel.cell.id, value)
              }
            />
          ) : null}
          <Toggle
            value={screenSel.cell.grow}
            label="grow (fill row)"
            onChange={(v) =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind !== "screen") return;
                const hit = findCell(a.widget, screenSel.cell.id);
                if (hit) hit.cell.grow = v;
              })
            }
          />
          <div className="flex gap-1.5 pt-1">
            <button
              type="button"
              className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind !== "screen") return;
                  const hit = findCell(a.widget, screenSel.cell.id);
                  if (hit) moveCell(hit.row, hit.cell.id, -1);
                })
              }
            >
              ← move
            </button>
            <button
              type="button"
              className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind !== "screen") return;
                  const hit = findCell(a.widget, screenSel.cell.id);
                  if (hit) moveCell(hit.row, hit.cell.id, 1);
                })
              }
            >
              move →
            </button>
            <button
              type="button"
              className="ml-auto rounded border border-border px-2 py-0.5 text-[11px] text-red-400 transition-colors hover:bg-red-500/10"
              onClick={() =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "screen") removeCell(a.widget, screenSel.cell.id);
                })
              }
            >
              delete
            </button>
          </div>
        </section>
      ) : screen && screenSel?.kind === "row" && screenSel.row ? (
        <section className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            row
          </p>
          <Segmented
            value={screenSel.row.align}
            options={ROW_ALIGNS}
            label="align"
            onChange={(v) =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind !== "screen") return;
                const r = findRow(a.widget, screenSel.row!.id);
                if (r) r.align = v as (typeof ROW_ALIGNS)[number];
              })
            }
          />
          <Segmented
            value={screenSel.row.justify}
            options={ROW_JUSTIFY}
            label="justify"
            onChange={(v) =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind !== "screen") return;
                const r = findRow(a.widget, screenSel.row!.id);
                if (r) r.justify = v as (typeof ROW_JUSTIFY)[number];
              })
            }
          />
          <NumberField
            value={screenSel.row.gap}
            label="gap"
            min={0}
            max={64}
            onChange={(v) =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind !== "screen") return;
                const r = findRow(a.widget, screenSel.row!.id);
                if (r) r.gap = v;
              })
            }
          />
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">add</span>
            <select
              name="add-cell"
              className={inputClass}
              value=""
              onChange={(e) => addCellFromPicker(screenSel.row!, e)}
            >
              <option value="">component…</option>
              {COMPONENT_REGISTRY.map((c) => (
                <option key={c.is} value={c.is}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-1.5 pt-1">
            <button
              type="button"
              className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "screen") moveScreenRow(a.widget, screenSel.row!.id, -1);
                })
              }
            >
              ↑ move
            </button>
            <button
              type="button"
              className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              onClick={() =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "screen") moveScreenRow(a.widget, screenSel.row!.id, 1);
                })
              }
            >
              move ↓
            </button>
            <button
              type="button"
              className="ml-auto rounded border border-border px-2 py-0.5 text-[11px] text-red-400 transition-colors hover:bg-red-500/10"
              onClick={() =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "screen") removeScreenRow(a.widget, screenSel.row!.id);
                })
              }
            >
              delete
            </button>
          </div>
        </section>
      ) : screen ? (
        <section className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            screen
          </p>
          <NumberField
            value={screen.gap}
            label="row gap"
            min={0}
            max={64}
            onChange={(v) =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind === "screen") a.widget.gap = v;
              })
            }
          />
          <NumberField
            value={screen.padding}
            label="padding"
            min={0}
            max={64}
            onChange={(v) =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind === "screen") a.widget.padding = v;
              })
            }
          />
          <button
            type="button"
            className="self-start rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind === "screen") addScreenRow(a.widget);
              })
            }
          >
            + row
          </button>
        </section>
      ) : image ? (
        <section className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            image
          </p>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">src</span>
            <input
              type="text"
              name="image-src"
              autoComplete="off"
              placeholder="https://…"
              value={image.src}
              className={inputClass}
              onChange={(e) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "image") a.widget.src = e.target.value;
                })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">alt</span>
            <input
              type="text"
              name="image-alt"
              autoComplete="off"
              value={image.alt}
              className={inputClass}
              onChange={(e) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "image") a.widget.alt = e.target.value;
                })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">pixel</span>
            <input
              type="range"
              name="image-cell"
              min={1}
              max={8}
              step={1}
              value={image.cell}
              className="flex-1 accent-foreground"
              onChange={(e) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "image") a.widget.cell = Number(e.target.value);
                })
              }
            />
            <span className="w-8 tabular-nums text-foreground">{image.cell}px</span>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">focus</span>
            <input
              type="range"
              name="image-focus"
              min={0}
              max={1}
              step={0.05}
              value={image.focusY}
              className="flex-1 accent-foreground"
              onChange={(e) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "image") a.widget.focusY = Number(e.target.value);
                })
              }
            />
            <span className="w-8 tabular-nums text-foreground">
              {image.focusY.toFixed(2)}
            </span>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">fade</span>
            <input
              type="range"
              name="image-fade"
              min={0}
              max={80}
              step={2}
              value={image.fade}
              className="flex-1 accent-foreground"
              onChange={(e) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "image") a.widget.fade = Number(e.target.value);
                })
              }
            />
            <span className="w-8 tabular-nums text-foreground">{image.fade}px</span>
          </label>
        </section>
      ) : gradient ? (
        <section className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            gradient
          </p>
          <Segmented
            value={gradient.direction}
            options={GRAD_DIRS}
            label="direction"
            onChange={(v) =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind === "gradient")
                  a.widget.direction = v as (typeof GRAD_DIRS)[number];
              })
            }
          />
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">pixel</span>
            <input
              type="range"
              name="gradient-cell"
              min={1}
              max={8}
              step={1}
              value={gradient.cell}
              className="flex-1 accent-foreground"
              onChange={(e) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "gradient") a.widget.cell = Number(e.target.value);
                })
              }
            />
            <span className="w-8 tabular-nums text-foreground">{gradient.cell}px</span>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-14 shrink-0">opacity</span>
            <input
              type="range"
              name="gradient-opacity"
              min={0}
              max={1}
              step={0.05}
              value={gradient.opacity}
              className="flex-1 accent-foreground"
              onChange={(e) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "gradient") a.widget.opacity = Number(e.target.value);
                })
              }
            />
            <span className="w-8 tabular-nums text-foreground">
              {gradient.opacity.toFixed(2)}
            </span>
          </label>
          <div className="text-[11px] text-muted-foreground">
            <span className="mb-1 block">from</span>
            <ColorField
              value={asFieldColor(gradient.from)}
              onChange={(v) =>
                patchSelectedArtboard((a) => {
                  if (a.widget?.kind === "gradient") a.widget.from = v as never;
                })
              }
            />
          </div>
          <Toggle
            value={gradient.twoTone}
            label="two-tone (blend into a colour)"
            onChange={(v) =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind === "gradient") a.widget.twoTone = v;
              })
            }
          />
          {gradient.twoTone ? (
            <div className="text-[11px] text-muted-foreground">
              <span className="mb-1 block">to</span>
              <ColorField
                value={asFieldColor(gradient.to)}
                onChange={(v) =>
                  patchSelectedArtboard((a) => {
                    if (a.widget?.kind === "gradient") a.widget.to = v as never;
                  })
                }
              />
            </div>
          ) : null}
          <BloomField
            value={gradient.bloom}
            onChange={(v) =>
              patchSelectedArtboard((a) => {
                if (a.widget?.kind === "gradient") a.widget.bloom = v;
              })
            }
          />
        </section>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Series / slice panel.
// ---------------------------------------------------------------------------

interface SeriesPanelProps {
  chart: ChartModel;
  series: SeriesRow;
  fam: "cartesian" | "pie" | "radar";
  layer: Layer | undefined;
  inputClass: string;
}

function SeriesPanel({ chart, series, fam, inputClass }: SeriesPanelProps) {
  const key = series.key;
  const setSeries = (producer: (s: SeriesRow) => void) =>
    patchSelectedChart((c) => {
      const s = c.series.find((x) => x.key === key);
      if (s) producer(s);
    });

  return (
    <>
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="w-14 shrink-0">label</span>
        <input
          type="text"
          name="series-label"
          autoComplete="off"
          value={series.label}
          className={inputClass}
          onChange={(e) => setSeries((s) => {
            s.label = e.target.value;
          })}
        />
      </label>
      <div className="text-[11px] text-muted-foreground">
        <span className="mb-1 block">color</span>
        <ColorField
          value={series.color}
          onChange={(v) => setSeries((s) => {
            s.color = v as never;
          })}
        />
      </div>
      {chart.type !== "line" ? (
        <TextureField
          value={series.variant}
          onChange={(v) => setSeries((s) => {
            s.variant = v;
          })}
        />
      ) : null}
      {fam === "cartesian" ? (
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="w-14 shrink-0">opacity</span>
          <input
            type="range"
            name="series-opacity"
            min={0}
            max={1}
            step={0.05}
            value={series.opacity}
            className="flex-1 accent-foreground"
            onChange={(e) => setSeries((s) => {
              s.opacity = Number(e.target.value);
            })}
          />
          <span className="w-8 tabular-nums text-foreground">
            {series.opacity.toFixed(2)}
          </span>
        </label>
      ) : null}
      <div className="flex gap-4 pt-0.5">
        <Toggle
          value={series.on}
          label="visible"
          onChange={(v) => setSeries((s) => {
            s.on = v;
          })}
        />
        <Toggle
          value={series.isClickable}
          label="clickable"
          onChange={(v) => setSeries((s) => {
            s.isClickable = v;
          })}
        />
      </div>

      {fam === "cartesian" ? (
        <section className="flex flex-col gap-2.5 border-t border-border/60 pt-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            markers
          </p>
          <Toggle
            value={series.dots.on}
            label="dots at every point"
            onChange={(v) => setSeries((s) => {
              s.dots.on = v;
            })}
          />
          {series.dots.on ? (
            <>
              <Segmented
                value={series.dots.variant}
                options={DOT_VARIANTS}
                label="style"
                onChange={(v) => setSeries((s) => {
                  s.dots.variant = v as (typeof DOT_VARIANTS)[number];
                })}
              />
              <NumberField
                value={series.dots.r}
                label="radius"
                min={1}
                max={8}
                step={0.5}
                onChange={(v) => setSeries((s) => {
                  s.dots.r = v;
                })}
              />
            </>
          ) : null}
          <Toggle
            value={series.activeDot.on}
            label="active dot on hover"
            onChange={(v) => setSeries((s) => {
              s.activeDot.on = v;
            })}
          />
          {series.activeDot.on ? (
            <>
              <Segmented
                value={series.activeDot.variant}
                options={DOT_VARIANTS}
                label="style"
                onChange={(v) => setSeries((s) => {
                  s.activeDot.variant = v as (typeof DOT_VARIANTS)[number];
                })}
              />
              <NumberField
                value={series.activeDot.r}
                label="radius"
                min={1}
                max={10}
                step={0.5}
                onChange={(v) => setSeries((s) => {
                  s.activeDot.r = v;
                })}
              />
            </>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

