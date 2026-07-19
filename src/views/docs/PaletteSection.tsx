"use client";

import { cssColor, Sparkline } from "@dither-kit";

import { DemoCard } from "./DemoCard";
import { COLORS, wave } from "./docs-data";
import { PropsTable, type PropRow } from "./PropsTable";

/**
 * PaletteSection — the "Palette" section (Utils group). Port of the final
 * inline `<section id="palette">` block in `src/pages/docs/DocsPage.vue`
 * (template lines 1582-1598).
 *
 * Vue renders this section LAST on the long docs page, after all the
 * component/example packs — it is the "Utils" group's single item. The
 * Next.js port keeps that placement: `DocsSections` renders it after every
 * other pack so the sidebar's scroll-spy reaches it at the very bottom
 * (matching the nav-registry GROUPS order: Overview · Handbook · Examples ·
 * Components · Utils).
 *
 * Extracted from `ChartsDocs` so that pack ends at `faulty-terminal` (the
 * last Components item) instead of swallowing the Utils section.
 */
const SNIPPET = `import { cssColor, type DitherColor } from "@dither-kit"
cssColor("blue") // rgb(53,143,243)`;

const API: Record<string, PropRow[]> = {
  palette: [
    { prop: "cssColor(c)", type: "(DitherColor | number) → css string", default: "—" },
    { prop: "seedFromColor(c)", type: "(DitherColor | number) → Seed", default: "—" },
    { prop: "seedFromHue(h)", type: "(number 0…360) → Seed", default: "—" },
    { prop: "DitherColor", type: '"green" … "grey" — seven seeds', default: "—" },
  ],
};

export function PaletteSection() {
  return (
    <section id="palette" className="mt-16 scroll-mt-24">
      <h2 className="text-lg tracking-tight">Palette</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        Seven seeded colors; every component resolves fill, line and sparkle
        hues from the same seed, so a dashboard stays coherent for free.
      </p>
      <DemoCard code={SNIPPET}>
        <div className="grid gap-3">
          {COLORS.map((c) => (
            <div key={c} className="flex items-center gap-4">
              <span className="w-14 text-[11px] text-muted-foreground">{c}</span>
              <span className="size-5 rounded-[3px]" style={{ backgroundColor: cssColor(c) }} />
              <Sparkline data={wave} color={c} class="h-6 flex-1" />
            </div>
          ))}
        </div>
      </DemoCard>
      <PropsTable rows={API.palette} />
    </section>
  );
}
