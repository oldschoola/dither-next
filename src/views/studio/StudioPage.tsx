"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { addArtboard } from "@/entities/editor";
import { ShortcutsHelp } from "@/features/keyboard";
import { hydrate, startAutosave, stopAutosave } from "@/features/persistence";
import { startHistory, stopHistory } from "@/features/history";
import { Canvas } from "@/widgets/canvas";
import { DataEditor } from "@/widgets/data-editor";
import { Inspector } from "@/widgets/inspector";
import { LayerTree } from "@/widgets/layer-tree";
import { Toolbar } from "@/widgets/toolbar";
import { CHART_TYPES, type ChartType } from "@/shared/config";
import { routePath } from "@/shared/lib";

// ExportDialog is lazy-loaded via next/dynamic (guide §11.7) — it pulls in the
// codegen + clipboard logic only when the user opens the export modal.
const ExportDialog = dynamic(
  () => import("@/features/export-code").then((m) => m.ExportDialog),
  { ssr: false },
);

/** StudioPage — the Figma-style editor. Port of `src/pages/studio/StudioPage.vue`.
 *
 * Boot order (guide §11.11, critical): `hydrate()` → `startAutosave()` →
 * `startHistory()` → deep-link handling → `replaceState` clean. The deep link
 * is read AFTER history starts so the added artboard is undoable. On unmount:
 * `stopAutosave` + `stopHistory` (singletons — route revisits must not
 * accumulate subscriptions). Below `lg` we show a desktop hint instead of a
 * broken layout. */
export function StudioPage() {
  const [exportOpen, setExportOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);

  // Boot once on mount — hydrate/autosave/history are module singletons.
  // Using a ref guard so React 18 strict-mode double-invoke of effects does
  // not double-start them (the singletons are idempotent, but the deep-link
  // addArtboard must run exactly once).
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    hydrate();
    startAutosave();
    startHistory();

    // Deep links: canonical /studio#new/<type> or legacy #/studio/new/<type>.
    // Both add the artboard once after history starts, then clean the URL.
    const wanted = window.location.hash.match(/^(?:#new\/|#\/studio\/new\/)([a-z]+)/)?.[1];
    if (wanted && (CHART_TYPES as readonly string[]).includes(wanted)) {
      addArtboard(wanted as ChartType);
      window.history.replaceState(null, "", routePath("/studio"));
    }
  }, []);

  // Desktop gate: the studio needs a wide screen for the layer rail + inspector.
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      stopAutosave();
      stopHistory();
    };
  }, []);

  if (!isDesktop) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-5 bg-background px-8 text-center font-mono text-foreground antialiased">
        <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground/60">
          studio
        </div>
        <h1 className="text-xl tracking-tight">Best on a desktop</h1>
        <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground [text-wrap:pretty]">
          The studio is a Figma-style editor — layer rail, inspector and
          keyboard shortcuts, built for a wide screen and a pointer. Open it on
          a laptop or desktop to design with the kit.
        </p>
        <div className="mt-2 flex items-center gap-5 text-[12px] text-muted-foreground">
          <a
            href={routePath("/docs")}
            className="transition-colors hover:text-foreground"
          >
            browse the docs →
          </a>
          <a href={routePath("/")} className="transition-colors hover:text-foreground">
            home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-background text-[13px] text-foreground antialiased">
      <Canvas />
      <Toolbar
        layersOpen={layersOpen}
        inspectorOpen={inspectorOpen}
        onLayersOpenChange={setLayersOpen}
        onInspectorOpenChange={setInspectorOpen}
        onExport={() => setExportOpen(true)}
      />

      {layersOpen ? (
        <aside className="studio-panel absolute bottom-16 left-3 top-16 z-20 w-64">
          <div className="panel-head">
            <span>Layers</span>
            <button
              type="button"
              aria-label="Close layers"
              onClick={() => setLayersOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <LayerTree />
          </div>
        </aside>
      ) : null}

      {inspectorOpen ? (
        <aside className="studio-panel absolute bottom-16 right-3 top-16 z-20 w-72 overflow-hidden">
          <Inspector />
        </aside>
      ) : null}

      <DataEditor />
      {exportOpen ? <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} /> : null}
      <ShortcutsHelp />
      <style jsx>{`
        .studio-panel {
          display: flex;
          flex-direction: column;
          border: 1px solid
            color-mix(in oklab, var(--color-border) 72%, transparent);
          border-radius: 0.5rem;
          background: color-mix(in oklab, var(--color-background) 96%, transparent);
          box-shadow: 0 4px 16px rgb(0 0 0 / 0.28);
        }
        .panel-head {
          display: flex;
          height: 2.25rem;
          flex-shrink: 0;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid
            color-mix(in oklab, var(--color-border) 60%, transparent);
          padding-inline: 0.75rem;
          font-size: 11px;
          color: var(--color-muted-foreground);
        }
        .panel-head button {
          display: grid;
          width: 1.75rem;
          height: 1.75rem;
          place-items: center;
          border-radius: 0.375rem;
        }
        .panel-head button:hover {
          background: var(--color-card);
          color: var(--color-foreground);
        }
      `}</style>
    </div>
  );
}
