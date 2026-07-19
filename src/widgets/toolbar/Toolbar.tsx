"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ArtboardKind } from "@/entities/artboard";
import {
  addArtboard,
  addComponentArtboard,
  addScreenArtboard,
  duplicateSelected,
  groupSelected,
  removeSelected,
  replay,
  setDataOpen,
  ungroup,
  useEditor,
} from "@/entities/editor";
import {
  COMPONENT_REGISTRY,
  type ComponentEntry,
  type ComponentGroup,
} from "@/entities/widget";
import { useHistory, redo, undo } from "@/features/history";
import { exportArtboardPng } from "@/features/export-image";
import {
  activeProjectName,
  createProject,
  deleteProject,
  exportDocument,
  importDocument,
  renameProject,
  switchProject,
  useActiveProjectId,
  useProjects,
} from "@/features/persistence";
import { addArtboardFromPreset, usePresets } from "@/features/presets";
import { CHART_TYPES } from "@/shared/config";
import { cn, routePath, useTheme } from "@/shared/lib";
import styles from "./Toolbar.module.css";

/**
 * Toolbar — the Studio top bar + floating selection toolbar. Verbatim port
 * of `src/widgets/toolbar/Toolbar.vue` (CONVERSION-GUIDE.md §11).
 *
 * Three `pointer-events-auto` groups over a `pointer-events-none` bar:
 *   1. Left: home link + project menu (switch/new/rename/save/open file/delete).
 *   2. Center: Library button → dropdown dialog (search, Canvas chart types +
 *      widget kinds + Screen, component groups, Presets).
 *   3. Right: Undo/Redo, toggle layers/inspector, theme toggle.
 *
 * A fourth element — the selection toolbar — is a fixed-bottom bar shown when
 * an artboard is selected. It is kept mounted and toggled via opacity/transform
 * classes (guide §6) to mirror the Vue `<Transition name="selection-tools">`.
 *
 * v-model:layers-open / v-model:inspector-open become controlled props
 * (`layersOpen` + `onLayersOpenChange`, `inspectorOpen` +
 * `onInspectorOpenChange`). `@export` becomes `onExport`.
 */

const CANVAS_WIDGET_KINDS = ["avatar", "button", "gradient", "image"] as const;

const GROUPS: { id: ComponentGroup; label: string }[] = [
  { id: "inputs", label: "Inputs" },
  { id: "navigation", label: "Navigation" },
  { id: "display", label: "Display" },
  { id: "overlays", label: "Overlays" },
  { id: "structure", label: "Structure" },
];

export interface ToolbarProps {
  layersOpen: boolean;
  inspectorOpen: boolean;
  onLayersOpenChange: (v: boolean) => void;
  onInspectorOpenChange: (v: boolean) => void;
  onExport: () => void;
}

export function Toolbar({
  layersOpen,
  inspectorOpen,
  onLayersOpenChange,
  onInspectorOpenChange,
  onExport,
}: ToolbarProps) {
  const { dark, toggle } = useTheme();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pngBusy, setPngBusy] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const projects = useProjects();
  const activeId = useActiveProjectId();
  const presets = usePresets();
  const { canUndo, canRedo } = useHistory();

  // Reactive editor slices for the selection toolbar.
  const selectedArtboardId = useEditor((s) => s.selectedArtboardId);
  const selectedIds = useEditor((s) => s.selectedIds);
  const dataOpen = useEditor((s) => s.dataOpen);
  const artboards = useEditor((s) => s.artboards);

  const selected = useMemo(
    () => artboards.find((a) => a.id === selectedArtboardId) ?? null,
    [artboards, selectedArtboardId],
  );

  const canEdit = selectedArtboardId !== "";
  const canData = !!selected && !selected.widget;
  const canUngroup = !!selected?.groupId;
  const selectionLabel =
    selectedIds.length > 1
      ? `${selectedIds.length} selected`
      : (selected?.name ?? "");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (entry: ComponentEntry) =>
      !q || `${entry.label} ${entry.is}`.toLowerCase().includes(q);
    return GROUPS.map((group) => ({
      ...group,
      items: COMPONENT_REGISTRY.filter(
        (entry) => entry.group === group.id && matches(entry),
      ),
    })).filter((group) => group.items.length);
  }, [query]);

  // Mirrors Vue's `watch(libraryOpen, ...)`: focus the search input when the
  // library opens and clear the query when it closes.
  useEffect(() => {
    if (libraryOpen) {
      // requestAnimationFrame defers focus until the input is painted, the
      // React analogue of Vue's nextTick.
      const id = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    setQuery("");
  }, [libraryOpen]);

  const closeMenus = () => {
    setLibraryOpen(false);
    setProjectOpen(false);
  };

  const add = (kind: ArtboardKind) => {
    addArtboard(kind);
    closeMenus();
  };
  const addComponent = (entry: ComponentEntry) => {
    addComponentArtboard(entry);
    closeMenus();
  };
  const addScreen = () => {
    addScreenArtboard();
    closeMenus();
  };

  const doUngroup = () => {
    if (selected?.groupId) ungroup(selected.groupId);
  };

  function newProject() {
    const name = window.prompt("Project name", `Project ${projects.length + 1}`);
    if (name) createProject(name);
    closeMenus();
  }
  function rename() {
    const name = window.prompt("Rename project", activeProjectName());
    if (name) renameProject(activeId, name);
    closeMenus();
  }
  function removeProject() {
    if (
      window.confirm(`Delete “${activeProjectName()}”? This cannot be undone.`)
    ) {
      deleteProject(activeId);
    }
    closeMenus();
  }
  async function openFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (file) await importDocument(file);
    input.value = "";
  }
  async function exportPng() {
    if (!selected || pngBusy) return;
    setPngBusy(true);
    await exportArtboardPng(selected, 2);
    setPngBusy(false);
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3">
      {/* 1. Left: home + project menu */}
      <div className="pointer-events-auto flex h-10 items-center rounded-lg border border-border/70 bg-background/95 px-1 shadow-[0_2px_8px_rgba(0,0,0,0.24)]">
        <a
          href={routePath("/")}
          className="flex h-8 items-center gap-2 rounded-md px-2.5 text-xs text-foreground transition-colors hover:bg-card"
          aria-label="dither-ui home"
        >
          <span className="size-2.5 rounded-[2px] bg-foreground" />
          <span>dither-ui</span>
        </a>
        <div className="relative border-l border-border/60 pl-1">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={projectOpen}
            className="flex h-8 max-w-48 items-center gap-1.5 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-card hover:text-foreground"
            onClick={() => {
              setProjectOpen((v) => !v);
              setLibraryOpen(false);
            }}
          >
            <span className="truncate">{activeProjectName()}</span>
            <span aria-hidden="true">⌄</span>
          </button>
          {projectOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-border bg-card p-1 shadow-[0_8px_24px_rgba(0,0,0,0.32)]"
            >
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  role="menuitem"
                  className={cn(
                    "flex w-full rounded-md px-2 py-1.5 text-left text-xs",
                    project.id === activeId
                      ? "bg-accent/15 text-foreground"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  )}
                  onClick={() => {
                    switchProject(project.id);
                    closeMenus();
                  }}
                >
                  {project.name}
                </button>
              ))}
              <div className="my-1 h-px bg-border" />
              <button type="button" role="menuitem" className={styles.menuRow} onClick={newProject}>
                New project
              </button>
              <button type="button" role="menuitem" className={styles.menuRow} onClick={rename}>
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.menuRow}
                onClick={() => {
                  exportDocument();
                  closeMenus();
                }}
              >
                Save to file
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.menuRow}
                onClick={() => {
                  fileInput.current?.click();
                  closeMenus();
                }}
              >
                Open file
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                role="menuitem"
                className={cn(styles.menuRow, "text-red-400")}
                onClick={removeProject}
              >
                Delete project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Center: Library */}
      <div className="pointer-events-auto relative">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={libraryOpen}
          className="flex h-10 items-center gap-2 rounded-lg border border-border/70 bg-background/95 px-3 text-xs text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.24)] transition-colors hover:bg-card active:scale-[0.96]"
          onClick={() => {
            setLibraryOpen((v) => !v);
            setProjectOpen(false);
          }}
        >
          <span aria-hidden="true" className="text-base leading-none">
            +
          </span>{" "}
          Library
        </button>
        {libraryOpen && (
          <div
            role="dialog"
            aria-label="Component library"
            className="absolute left-1/2 top-full mt-2 flex max-h-[min(72vh,640px)] w-[420px] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[0_12px_36px_rgba(0,0,0,0.38)]"
          >
            <label className="border-b border-border/60 p-2">
              <span className="sr-only">Search components</span>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                name="component-search"
                placeholder="Search 55 components…"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-accent/60"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setLibraryOpen(false);
                }}
              />
            </label>
            <div className="overflow-y-auto p-2">
              {!query && (
                <section className="mb-3">
                  <p className={styles.libraryLabel}>Canvas</p>
                  <div className="grid grid-cols-3 gap-1">
                    {CHART_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={cn(styles.libraryItem, "capitalize")}
                        onClick={() => add(type)}
                      >
                        {type} chart
                      </button>
                    ))}
                    {CANVAS_WIDGET_KINDS.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={cn(styles.libraryItem, "capitalize")}
                        onClick={() => add(type)}
                      >
                        {type}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={styles.libraryItem}
                      onClick={addScreen}
                    >
                      Screen
                    </button>
                  </div>
                </section>
              )}
              {grouped.map((group) => (
                <section key={group.id} className="mb-3 last:mb-0">
                  <p className={styles.libraryLabel}>{group.label}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {group.items.map((entry) => (
                      <button
                        key={entry.is}
                        type="button"
                        className={cn(styles.libraryItem, "text-left")}
                        onClick={() => addComponent(entry)}
                      >
                        <span className="block truncate text-foreground">
                          {entry.label}
                        </span>
                        <span className="block truncate text-[9px] text-muted-foreground/60">
                          {entry.is}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              {presets.length > 0 && !query && (
                <section>
                  <p className={styles.libraryLabel}>Presets</p>
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      className={cn(styles.libraryItem, "w-full text-left")}
                      onClick={() => {
                        addArtboardFromPreset(preset);
                        closeMenus();
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </section>
              )}
              {grouped.length === 0 && (
                <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                  No components match “{query}”.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Right: history + toggles + theme */}
      <div className="pointer-events-auto flex h-10 items-center gap-0.5 rounded-lg border border-border/70 bg-background/95 p-1 shadow-[0_2px_8px_rgba(0,0,0,0.24)]">
        <button
          type="button"
          aria-label="Undo"
          title="Undo (⌘Z)"
          disabled={!canUndo}
          className={styles.tool}
          onClick={undo}
        >
          ↶
        </button>
        <button
          type="button"
          aria-label="Redo"
          title="Redo (⌘⇧Z)"
          disabled={!canRedo}
          className={styles.tool}
          onClick={redo}
        >
          ↷
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          aria-label="Toggle layers"
          aria-pressed={layersOpen}
          title="Layers"
          className={styles.tool}
          onClick={() => onLayersOpenChange(!layersOpen)}
        >
          ☷
        </button>
        <button
          type="button"
          aria-label="Toggle properties"
          aria-pressed={inspectorOpen}
          title="Properties"
          className={styles.tool}
          onClick={() => onInspectorOpenChange(!inspectorOpen)}
        >
          ◫
        </button>
        <button
          type="button"
          aria-label={dark ? "Use light theme" : "Use dark theme"}
          className={styles.tool}
          onClick={toggle}
        >
          {dark ? "☀" : "◐"}
        </button>
      </div>

      {/* Selection toolbar — kept mounted, toggled via transition classes (guide §6). */}
      <div
        role="toolbar"
        aria-label="Selection actions"
        className={cn(
          "pointer-events-auto fixed left-1/2 z-30 flex h-10 -translate-x-1/2 items-center gap-0.5 rounded-lg border border-border/70 bg-background/95 p-1 shadow-[0_2px_8px_rgba(0,0,0,0.24)] transition-[transform,opacity] duration-[160ms] ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
          canEdit
            ? "opacity-100 translate-y-0"
            : "pointer-events-none translate-y-1.5 opacity-0",
          dataOpen ? "bottom-[17rem]" : "bottom-3",
        )}
      >
        <span
          className="max-w-36 truncate px-2 text-[11px] text-foreground"
          aria-live="polite"
        >
          {selectionLabel}
        </span>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <button
          type="button"
          title="Duplicate (⌘D)"
          className={cn(styles.tool, styles.wide)}
          onClick={duplicateSelected}
        >
          duplicate
        </button>
        {canUngroup ? (
          <button
            type="button"
            title="Ungroup (⌘⇧G)"
            className={cn(styles.tool, styles.wide)}
            onClick={doUngroup}
          >
            ungroup
          </button>
        ) : (
          <button
            type="button"
            title="Group (⌘G)"
            className={cn(styles.tool, styles.wide)}
            onClick={groupSelected}
          >
            group
          </button>
        )}
        <button
          type="button"
          title="Delete (⌫)"
          className={cn(styles.tool, styles.wide, "text-red-400")}
          onClick={removeSelected}
        >
          delete
        </button>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <button
          type="button"
          title="Replay animation"
          className={styles.tool}
          aria-label="Replay animation"
          onClick={replay}
        >
          ↻
        </button>
        {canData && (
          <button
            type="button"
            className={cn(styles.tool, styles.wide, dataOpen && "bg-card text-foreground")}
            aria-pressed={dataOpen}
            onClick={() => setDataOpen(!dataOpen)}
          >
            data
          </button>
        )}
        <button
          type="button"
          className={cn(styles.tool, styles.wide)}
          onClick={onExport}
        >
          code
        </button>
        <button
          type="button"
          disabled={pngBusy}
          className={cn(styles.tool, styles.wide)}
          onClick={exportPng}
        >
          {pngBusy ? "saving…" : "png"}
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        name="open-project"
        className="hidden"
        onChange={openFile}
      />
    </div>
  );
}
