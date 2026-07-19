"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Artboard } from "@/entities/artboard";
import { type Layer, layersOf } from "@/entities/chart";
import {
  deleteGroup,
  deleteSeries,
  duplicateSelected,
  type Group,
  groupSelected,
  patchArtboard,
  removeArtboard,
  renameGroup,
  selectArtboard,
  selectGroup,
  selectLayer,
  setArtboardHidden,
  setArtboardLocked,
  setGroupCollapsed,
  setGroupHidden,
  setGroupLocked,
  ungroup,
  useEditor,
} from "@/entities/editor";
import { componentEntry } from "@/entities/widget";
import { savePreset } from "@/features/presets";
import { cssColor } from "@dither-kit";
import { cn } from "@/shared/lib";
import { ContextMenu, type MenuItem } from "@/shared/ui";

/**
 * LayerTree — the Studio layers panel. Verbatim port of
 * `src/widgets/layer-tree/LayerTree.vue` (CONVERSION-GUIDE.md §11).
 *
 * A `role="listbox"` whose rows are focusable `role="option"`s (group,
 * artboard, layer). Screen sub-nodes (rows + cells) are plain non-option
 * rows. Enter/Space select; ↑/↓ move focus and stopPropagation so the
 * window-level arrow-nudge shortcut (features/keyboard/useShortcuts) does
 * not fire from inside the tree. Rename inputs appear inline when a frame
 * or group enters rename mode.
 *
 * Mutations route through the editor store (patchArtboard for chart
 * sub-fields, renameGroup/setGroupCollapsed for groups) — the Vue SFC
 * mutated chart fields and `g.name`/`g.collapsed` directly.
 */

type Node =
  | { t: "group"; group: Group }
  | { t: "artboard"; a: Artboard; depth: number }
  | { t: "layer"; a: Artboard; layer: Layer; depth: number }
  // screen sub-nodes: rows and their component cells
  | { t: "snode"; a: Artboard; id: string; label: string; depth: number };

export function LayerTree() {
  const artboards = useEditor((s) => s.artboards);
  const groups = useEditor((s) => s.groups);
  const selectedIds = useEditor((s) => s.selectedIds);
  const selectedLayerId = useEditor((s) => s.selectedLayerId);

  const rootRef = useRef<HTMLDivElement | null>(null);

  // collapsed artboard ids (local UI state; groups carry their own
  // `collapsed` flag in the store via setGroupCollapsed).
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const isOpen = (id: string) => !collapsed.has(id);
  function toggleArtboard(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // --- state helpers ---------------------------------------------------------
  const isSel = (id: string) => selectedIds.includes(id);
  const members = (g: Group) => artboards.filter((a) => a.groupId === g.id);
  const groupHidden = (g: Group) => {
    const ms = members(g);
    return ms.length > 0 && ms.every((a) => a.hidden);
  };
  const groupLocked = (g: Group) => {
    const ms = members(g);
    return ms.length > 0 && ms.every((a) => a.locked);
  };

  const seriesOf = (a: Artboard, l: Layer) =>
    a.chart.series.find((s) => s.key === l.seriesKey);

  function layerVisible(a: Artboard, l: Layer): boolean {
    const c = a.chart;
    switch (l.kind) {
      case "grid": return c.grid.on;
      case "xAxis": return c.xAxis.on;
      case "yAxis": return c.yAxis.on;
      case "legend": return c.legend.on;
      case "tooltip": return c.tooltip.on;
      case "series": return seriesOf(a, l)?.on ?? true;
      default: return true;
    }
  }
  function layerLocked(a: Artboard, l: Layer): boolean {
    const c = a.chart;
    switch (l.kind) {
      case "grid": return c.grid.locked;
      case "xAxis": return c.xAxis.locked;
      case "yAxis": return c.yAxis.locked;
      case "legend": return c.legend.locked;
      case "tooltip": return c.tooltip.locked;
      case "series": return seriesOf(a, l)?.locked ?? false;
      default: return false;
    }
  }
  const togglable = (l: Layer) => l.kind !== "root" && l.kind !== "pie";

  function toggleLayerVis(a: Artboard, l: Layer) {
    if (layerLocked(a, l)) return;
    patchArtboard(a.id, (clone) => {
      const c = clone.chart;
      switch (l.kind) {
        case "grid": c.grid.on = !c.grid.on; break;
        case "xAxis": c.xAxis.on = !c.xAxis.on; break;
        case "yAxis": c.yAxis.on = !c.yAxis.on; break;
        case "legend": c.legend.on = !c.legend.on; break;
        case "tooltip": c.tooltip.on = !c.tooltip.on; break;
        case "series": { const s = c.series.find((x) => x.key === l.seriesKey); if (s) s.on = !s.on; break; }
      }
    });
  }
  function toggleLayerLock(a: Artboard, l: Layer) {
    patchArtboard(a.id, (clone) => {
      const c = clone.chart;
      switch (l.kind) {
        case "grid": c.grid.locked = !c.grid.locked; break;
        case "xAxis": c.xAxis.locked = !c.xAxis.locked; break;
        case "yAxis": c.yAxis.locked = !c.yAxis.locked; break;
        case "legend": c.legend.locked = !c.legend.locked; break;
        case "tooltip": c.tooltip.locked = !c.tooltip.locked; break;
        case "series": { const s = c.series.find((x) => x.key === l.seriesKey); if (s) s.locked = !s.locked; break; }
      }
    });
  }

  // --- node list (mirrors the Vue `nodes` computed) --------------------------
  // Widget frames (avatar/button/gradient) are single nodes — no chart layers.
  const childLayers = (a: Artboard): Layer[] =>
    a.widget ? [] : layersOf(a.chart, a.id).filter((l) => l.kind !== "root");

  const nodes = useMemo<Node[]>(() => {
    const out: Node[] = [];
    const pushArtboard = (a: Artboard, depth: number) => {
      out.push({ t: "artboard", a, depth });
      if (!isOpen(a.id)) return;
      if (a.widget?.kind === "screen") {
        a.widget.rows.forEach((row, ri) => {
          out.push({ t: "snode", a, id: `${a.id}:row:${row.id}`, label: `Row ${ri + 1}`, depth: depth + 1 });
          for (const cell of row.cells) {
            const label = componentEntry(cell.is)?.label ?? cell.is;
            out.push({ t: "snode", a, id: `${a.id}:cell:${cell.id}`, label, depth: depth + 2 });
          }
        });
        return;
      }
      for (const l of childLayers(a)) out.push({ t: "layer", a, layer: l, depth: depth + 1 });
    };
    const seen = new Set<string>();
    for (const a of artboards) {
      if (a.groupId) {
        if (seen.has(a.groupId)) continue;
        seen.add(a.groupId);
        const g = groups.find((x) => x.id === a.groupId);
        if (!g) { pushArtboard(a, 0); continue; }
        out.push({ t: "group", group: g });
        if (!g.collapsed)
          for (const m of artboards.filter((x) => x.groupId === g.id)) pushArtboard(m, 1);
      } else {
        pushArtboard(a, 0);
      }
    }
    return out;
  }, [artboards, groups, collapsed]);

  // --- selection -------------------------------------------------------------
  function clickArtboard(a: Artboard, additive: boolean) {
    selectArtboard(a.id, additive);
    setCollapsed((prev) => {
      if (!prev.has(a.id)) return prev;
      const next = new Set(prev);
      next.delete(a.id);
      return next;
    });
  }

  // --- rename (frames + groups) ---------------------------------------------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  // nextTick(() => renameInput.value?.select()) → focus+select on edit start.
  useEffect(() => {
    if (editingId) renameInputRef.current?.select();
  }, [editingId]);

  function startRename(id: string, current: string) {
    setEditingId(id);
    setEditText(current);
  }
  function commitArtboardName(a: Artboard) {
    if (editingId !== a.id) return;
    const t = editText.trim();
    if (t) patchArtboard(a.id, (clone) => { clone.name = t; });
    setEditingId(null);
  }
  function commitGroupName(g: Group) {
    if (editingId !== g.id) return;
    const t = editText.trim();
    if (t) renameGroup(g.id, t);
    setEditingId(null);
  }

  // --- context menu ---------------------------------------------------------
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  function open(e: React.MouseEvent, items: MenuItem[]) {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items });
  }
  function artboardItems(a: Artboard): MenuItem[] {
    return [
      { label: "Rename", onClick: () => startRename(a.id, a.name) },
      { label: "Duplicate", onClick: () => { if (!isSel(a.id)) selectArtboard(a.id); duplicateSelected(); } },
      ...(!a.widget
        ? [{
            label: "Save as preset",
            onClick: () => {
              const name = window.prompt("Preset name", a.name);
              if (name) savePreset(name, a);
            },
          }]
        : []),
      { divider: true },
      { label: "Group selection", onClick: () => { if (!isSel(a.id)) selectArtboard(a.id); groupSelected(); } },
      ...(a.groupId ? [{ label: "Ungroup", onClick: () => ungroup(a.groupId!) }] : []),
      { divider: true },
      { label: a.locked ? "Unlock" : "Lock", onClick: () => setArtboardLocked(a.id, !a.locked) },
      { label: a.hidden ? "Show" : "Hide", onClick: () => setArtboardHidden(a.id, !a.hidden) },
      { divider: true },
      { label: "Delete", danger: true, onClick: () => removeArtboard(a.id) },
    ];
  }
  function groupItems(g: Group): MenuItem[] {
    return [
      { label: "Rename", onClick: () => startRename(g.id, g.name) },
      { label: "Ungroup", onClick: () => ungroup(g.id) },
      { divider: true },
      { label: groupLocked(g) ? "Unlock all" : "Lock all", onClick: () => setGroupLocked(g.id, !groupLocked(g)) },
      { label: groupHidden(g) ? "Show all" : "Hide all", onClick: () => setGroupHidden(g.id, !groupHidden(g)) },
      { divider: true },
      { label: "Delete group", danger: true, onClick: () => deleteGroup(g.id) },
    ];
  }
  function layerItems(a: Artboard, l: Layer): MenuItem[] {
    const base: MenuItem[] = [
      { label: layerVisible(a, l) ? "Hide" : "Show", disabled: layerLocked(a, l), onClick: () => toggleLayerVis(a, l) },
      { label: layerLocked(a, l) ? "Unlock" : "Lock", onClick: () => toggleLayerLock(a, l) },
    ];
    if (l.kind === "series")
      base.push({ divider: true }, { label: "Delete", danger: true, onClick: () => deleteSeries(l.seriesKey!) });
    return base;
  }

  // --- keyboard: ↑/↓ move focus between option rows, swallow so the canvas
  //     arrow-nudge (window-level) does not fire. --------------------------------
  function onRowsKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const root = rootRef.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLElement>('[role="option"]'));
    const i = rows.indexOf(e.target as HTMLElement);
    if (i < 0) return; // focus is in a rename input or icon button
    e.preventDefault();
    e.stopPropagation();
    rows[Math.min(rows.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
  }

  return (
    <div
      ref={rootRef}
      role="listbox"
      aria-label="Layers"
      className="flex flex-col gap-px text-[13px]"
      onKeyDown={onRowsKey}
    >
      {nodes.map((node) => {
        const key =
          node.t === "group" ? node.group.id
          : node.t === "artboard" ? node.a.id
          : node.t === "snode" ? node.id
          : node.layer.id;

        if (node.t === "snode") {
          return (
            <div
              key={key}
              className={cn(
                "flex h-7 cursor-pointer items-center gap-2 rounded pr-1.5 transition-colors",
                selectedLayerId === node.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-card",
              )}
              style={{ paddingLeft: `${8 + node.depth * 16}px` }}
              onClick={() => selectLayer(node.id)}
            >
              <span className="truncate text-[12px]">{node.label}</span>
            </div>
          );
        }

        if (node.t === "group") {
          const g = node.group;
          const sel = members(g).some((m) => isSel(m.id));
          const locked = groupLocked(g);
          const hidden = groupHidden(g);
          return (
            <div
              key={key}
              role="option"
              tabIndex={0}
              aria-selected={sel}
              aria-label={`Group ${g.name}`}
              className={cn(
                "group/row flex h-7 items-center gap-1 rounded pl-1 pr-1.5 transition-colors",
                sel ? "bg-accent/10" : "hover:bg-card",
              )}
              onClick={() => selectGroup(g.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target === e.currentTarget) { e.preventDefault(); selectGroup(g.id); }
                else if (e.key === " " && e.target === e.currentTarget) { e.preventDefault(); selectGroup(g.id); }
              }}
              onContextMenu={(e) => open(e, groupItems(g))}
            >
              <button
                type="button"
                aria-label={g.collapsed ? "Expand group" : "Collapse group"}
                className="flex size-5 shrink-0 items-center justify-center text-muted-foreground/70 hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); setGroupCollapsed(g.id, !g.collapsed); }}
              >
                <svg viewBox="0 0 24 24" className={cn("size-3 transition-transform", !g.collapsed && "rotate-90")} fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 6l6 6-6 6" /></svg>
              </button>
              <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-muted-foreground/70" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
              {editingId === g.id ? (
                <input
                  ref={renameInputRef}
                  name="group-rename"
                  autoComplete="off"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-accent/60 bg-background px-1 py-0.5 text-[13px] text-foreground outline-none"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitGroupName(g); }
                    else if (e.key === "Escape") { e.preventDefault(); setEditingId(null); }
                  }}
                  onBlur={() => commitGroupName(g)}
                />
              ) : (
                <span
                  className="truncate font-medium text-foreground/90"
                  onDoubleClick={(e) => { e.stopPropagation(); startRename(g.id, g.name); }}
                >
                  {g.name}
                </span>
              )}
              <span className="ml-auto flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={locked ? "Unlock group" : "Lock group"}
                  aria-pressed={locked}
                  className={cn(
                    "flex size-6 items-center justify-center rounded hover:bg-background",
                    locked ? "text-accent" : "text-muted-foreground opacity-0 group-hover/row:opacity-70",
                  )}
                  onClick={(e) => { e.stopPropagation(); setGroupLocked(g.id, !locked); }}
                >
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    {locked ? <path d="M8 11V7a4 4 0 0 1 8 0v4" /> : <path d="M8 11V7a4 4 0 0 1 7-2.6" />}
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={hidden ? "Show group" : "Hide group"}
                  aria-pressed={hidden}
                  className={cn(
                    "flex size-6 items-center justify-center rounded hover:bg-background",
                    hidden ? "text-muted-foreground" : "text-muted-foreground opacity-0 group-hover/row:opacity-70",
                  )}
                  onClick={(e) => { e.stopPropagation(); setGroupHidden(g.id, !hidden); }}
                >
                  {!hidden ? (
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 2l20 20M6.7 6.7A10.5 10.5 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.3-1.5" /></svg>
                  )}
                </button>
              </span>
            </div>
          );
        }

        if (node.t === "artboard") {
          const a = node.a;
          const sel = isSel(a.id);
          return (
            <div
              key={key}
              role="option"
              tabIndex={0}
              aria-selected={sel}
              aria-label={a.name}
              className={cn(
                "group/row flex h-7 items-center gap-1 rounded pr-1.5 transition-colors",
                sel ? "bg-accent/15" : "hover:bg-card",
                a.hidden && "opacity-45",
              )}
              style={{ paddingLeft: `${4 + node.depth * 16}px` }}
              onClick={(e) => clickArtboard(a, e.metaKey || e.ctrlKey || e.shiftKey)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                  e.preventDefault();
                  clickArtboard(a, false);
                }
              }}
              onContextMenu={(e) => open(e, artboardItems(a))}
            >
              <button
                type="button"
                aria-label={isOpen(a.id) ? "Collapse layers" : "Expand layers"}
                className="flex size-5 shrink-0 items-center justify-center text-muted-foreground/70 hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); toggleArtboard(a.id); }}
              >
                <svg viewBox="0 0 24 24" className={cn("size-3 transition-transform", isOpen(a.id) && "rotate-90")} fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M9 6l6 6-6 6" /></svg>
              </button>
              <span className={cn("grid size-3.5 shrink-0 place-items-center text-[13px] font-semibold leading-none", sel ? "text-accent" : "text-muted-foreground/60")}>#</span>
              {editingId === a.id ? (
                <input
                  ref={renameInputRef}
                  name="artboard-rename"
                  autoComplete="off"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-accent/60 bg-background px-1 py-0.5 text-[13px] text-foreground outline-none"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitArtboardName(a); }
                    else if (e.key === "Escape") { e.preventDefault(); setEditingId(null); }
                  }}
                  onBlur={() => commitArtboardName(a)}
                />
              ) : (
                <span
                  className={cn("truncate", sel ? "font-medium text-foreground" : "text-foreground/90")}
                  onDoubleClick={(e) => { e.stopPropagation(); startRename(a.id, a.name); }}
                >
                  {a.name}
                </span>
              )}
              <span className="ml-auto flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={a.locked ? "Unlock artboard" : "Lock artboard"}
                  aria-pressed={a.locked}
                  className={cn(
                    "flex size-6 items-center justify-center rounded hover:bg-background",
                    a.locked ? "text-accent" : "text-muted-foreground opacity-0 group-hover/row:opacity-70",
                  )}
                  onClick={(e) => { e.stopPropagation(); setArtboardLocked(a.id, !a.locked); }}
                >
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    {a.locked ? <path d="M8 11V7a4 4 0 0 1 8 0v4" /> : <path d="M8 11V7a4 4 0 0 1 7-2.6" />}
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={a.hidden ? "Show artboard" : "Hide artboard"}
                  aria-pressed={a.hidden}
                  className={cn(
                    "flex size-6 items-center justify-center rounded hover:bg-background",
                    a.hidden ? "text-muted-foreground" : "text-muted-foreground opacity-0 group-hover/row:opacity-70",
                  )}
                  onClick={(e) => { e.stopPropagation(); setArtboardHidden(a.id, !a.hidden); }}
                >
                  {!a.hidden ? (
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 2l20 20M6.7 6.7A10.5 10.5 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.3-1.5" /></svg>
                  )}
                </button>
              </span>
              {editingId !== a.id && (
                <span className="shrink-0 text-[11px] capitalize text-muted-foreground/50">
                  {a.widget?.kind ?? a.chart.type}
                </span>
              )}
            </div>
          );
        }

        // node.t === "layer"
        const a = node.a;
        const l = node.layer;
        const sel = selectedLayerId === l.id;
        const vis = layerVisible(a, l);
        const lock = layerLocked(a, l);
        const series = l.kind === "series" ? seriesOf(a, l) : undefined;
        return (
          <div
            key={key}
            role="option"
            tabIndex={0}
            aria-selected={sel}
            aria-label={l.label}
            className={cn(
              "group/row flex h-7 items-center gap-2 rounded pr-1.5 transition-colors",
              sel ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-card",
              !vis && togglable(l) && "opacity-45",
            )}
            style={{ paddingLeft: `${8 + node.depth * 16}px` }}
            onClick={() => selectLayer(l.id)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                e.preventDefault();
                selectLayer(l.id);
              }
            }}
            onContextMenu={(e) => open(e, layerItems(a, l))}
          >
            <span className="truncate text-[12px]">{l.label}</span>
            {l.kind === "series" && series && (
              <span className="ml-auto size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: cssColor(series.color) }} />
            )}
            {togglable(l) && (
              <span className={cn("flex items-center gap-0.5", l.kind === "series" ? "" : "ml-auto")}>
                <button
                  type="button"
                  aria-label={lock ? "Unlock layer" : "Lock layer"}
                  aria-pressed={lock}
                  className={cn(
                    "flex size-6 items-center justify-center rounded hover:bg-black/10",
                    lock ? "opacity-90" : "opacity-0 group-hover/row:opacity-70",
                  )}
                  onClick={(e) => { e.stopPropagation(); toggleLayerLock(a, l); }}
                >
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    {lock ? <path d="M8 11V7a4 4 0 0 1 8 0v4" /> : <path d="M8 11V7a4 4 0 0 1 7-2.6" />}
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={vis ? "Hide layer" : "Show layer"}
                  aria-pressed={!vis}
                  className={cn(
                    "flex size-6 items-center justify-center rounded hover:bg-black/10",
                    !vis ? "opacity-90" : "opacity-0 group-hover/row:opacity-70",
                  )}
                  onClick={(e) => { e.stopPropagation(); toggleLayerVis(a, l); }}
                >
                  {vis ? (
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 2l20 20M6.7 6.7A10.5 10.5 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.3-1.5" /></svg>
                  )}
                </button>
              </span>
            )}
          </div>
        );
      })}

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}
