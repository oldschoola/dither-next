"use client";

import { useState } from "react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  DitherButton,
  Line,
  LineChart,
  XAxis,
  type DitherColor,
} from "@dither-kit";

import { CodeBlock } from "./CodeBlock";
import { DemoCard } from "./DemoCard";
import { PropsTable } from "./PropsTable";
import { SNIPPETS, API } from "./docs-snippets";
import {
  config,
  DURATIONS,
  effectConfig,
  effectData,
  rows,
  trafficConfig,
  trafficRows,
} from "./docs-data";

/**
 * Handbook pack — Styling, Composition, Seeds, Motion, Accessibility.
 *
 * Port of the corresponding sections in `src/pages/docs/DocsPage.vue`
 * (template lines 844-977). The Handbook is prose + CodeBlock (no DemoCard)
 * EXCEPT Seeds and Motion, which have live playground demos:
 *
 *  - Seeds: one master seed drives an AreaChart; "Roll a personality" picks a
 *    new random seed and bumps the replay token.
 *  - Motion: a BarChart with a live duration picker + replay button, plus a
 *    LineChart with a dedicated `effect` seed playground.
 */
export function HandbookPack() {
  const [masterSeed, setMasterSeed] = useState(1984);
  const [masterReplay, setMasterReplay] = useState(0);

  const [replayToken, setReplayToken] = useState(0);
  const [motionDuration, setMotionDuration] = useState(900);

  const [effectSeed, setEffectSeed] = useState(7);

  return (
    <>
      {/* Styling */}
      <section id="styling" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Styling</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Pixels come from the palette seeds; chrome — axes, legend, tooltip,
          borders — reads shadcn-style CSS tokens. Override the tokens to
          theme, pass <code className="text-foreground/80">class</code> to
          compose with your own utilities.
        </p>
        <div className="mt-5">
          <CodeBlock code={SNIPPETS.styling} />
        </div>
      </section>

      {/* Composition */}
      <section id="composition" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Composition</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          A chart is a root plus parts. The root measures, builds scales and
          provides context; children register themselves — grid and axes as
          chrome, <code className="text-foreground/80">Area</code>/
          <code className="text-foreground/80">Line</code>/
          <code className="text-foreground/80">Bar</code> as series,{" "}
          <code className="text-foreground/80">Dot</code> nested inside a
          series. Order in the template is paint order.
        </p>
        <div className="mt-5">
          <CodeBlock code={SNIPPETS.composition} />
        </div>
      </section>

      {/* Seeds */}
      <section id="seeds" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Seeds</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Everything visual in the kit resolves from deterministic seeds —
          avatars from names, colors from hues, textures, bloom, easing and
          motion from integers. Give a chart a{" "}
          <code className="text-foreground/80">seed</code> and it derives a
          whole personality for every prop you left unset; the same seed
          reproduces it forever. Explicit props always win.
        </p>
        <DemoCard code={SNIPPETS.seeds}>
          <div className="grid gap-5">
            <div className="h-52">
              <AreaChart
                key={masterSeed}
                data={rows}
                config={config}
                seed={masterSeed}
                interactive={false}
                replayToken={masterReplay}
              >
                <XAxis dataKey="month" maxTicks={6} />
                <Area dataKey="expenses" variant={masterSeed + 1} />
                <Area dataKey="revenue" variant={masterSeed} />
              </AreaChart>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <DitherButton
                color="blue"
                variant="gradient"
                onClick={() => {
                  setMasterSeed(Math.floor(Math.random() * 1_000_000));
                  setMasterReplay((r) => r + 1);
                }}
              >
                Roll a personality
              </DitherButton>
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                seed: {masterSeed}
              </span>
              <DitherButton color="purple" variant="dotted" bloom={masterSeed}>
                seeded bloom
              </DitherButton>
            </div>
          </div>
        </DemoCard>
      </section>

      {/* Motion */}
      <section id="motion" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Motion</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Entrances draw the dither field in; bump{" "}
          <code className="text-foreground/80">replay-token</code> to run one
          again. When the OS asks for reduced motion, entrances snap and
          sparkles hold still — no opt-in needed.
        </p>
        <DemoCard code={SNIPPETS.motion}>
          <div className="grid gap-5">
            <div className="h-48">
              <BarChart
                data={trafficRows}
                config={trafficConfig}
                interactive={false}
                animationDuration={motionDuration}
                replayToken={replayToken}
              >
                <XAxis dataKey="month" />
                <Bar dataKey="organic" />
                <Bar dataKey="paid" />
              </BarChart>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <DitherButton
                color="blue"
                variant="gradient"
                onClick={() => setReplayToken((t) => t + 1)}
              >
                Replay
              </DitherButton>
              <div className="flex items-center gap-1 rounded-md border border-border/60 p-1">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`rounded px-2.5 py-1 text-[11px] tabular-nums transition-colors ${
                      motionDuration === d
                        ? "bg-card text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => {
                      setMotionDuration(d);
                      setReplayToken((t) => t + 1);
                    }}
                  >
                    {d}ms
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DemoCard>
        <h3 className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          live-edge motion
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          The live edge isn&apos;t a preset — it&apos;s a point in a continuous
          space of motion (drift, gravity, twinkle, trail, flow) AND particle
          shape (a generated glyph: dot, plus, x, streak, asterisk). A
          dedicated <code className="text-foreground/80">:effect</code> seed
          samples one of infinitely many; roll for a fresh one.
        </p>
        <div className="mt-4 rounded-lg border border-border/60 p-4">
          <div className="h-44">
            <LineChart
              key={effectSeed}
              data={effectData}
              config={effectConfig}
              effect={effectSeed}
              interactive={false}
            >
              <Line dataKey="v" />
            </LineChart>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <DitherButton
              color="blue"
              variant="gradient"
              onClick={() => setEffectSeed(Math.floor(Math.random() * 1_000_000))}
            >
              Roll a motion
            </DitherButton>
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              effect: {effectSeed}
            </span>
          </div>
        </div>
        <PropsTable rows={API.motion} />
      </section>

      {/* Accessibility */}
      <section id="accessibility" className="mt-16 scroll-mt-24">
        <h2 className="text-lg tracking-tight">Accessibility</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Canvases are decoration and stay{" "}
          <code className="text-foreground/80">aria-hidden</code>; each chart
          exposes a single labelled node instead of hundreds of shapes. Legends
          are real buttons. Reduced motion snaps entrances and stills the
          sparkles; reduced transparency solidifies floating chrome — both
          from the OS setting, no props required.
        </p>
        <div className="mt-5">
          <CodeBlock code={SNIPPETS.accessibility} />
        </div>
      </section>
    </>
  );
}

// Re-export the config type for callers that need the chart config shape.
export type { DitherColor };
