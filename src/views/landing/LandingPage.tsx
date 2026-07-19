"use client";

/**
 * dither-ui landing page — Japanese minimal (Ma/Kanso).
 *
 * React port of `src/pages/landing/LandingPage.vue` (guide §11). One
 * statement, one action, one visual. The load choreography is a CSS-only
 * `.reveal` stagger (0/90/180/300ms), disabled under `prefers-reduced-motion`.
 * Emote hover reactions are CSS-only (`.emote` + `.group:hover`); there are
 * no JS timers on the landing — the only client behaviour is the one-shot
 * sprite blit on mount (faces.webp is transparency-baked, so no runtime
 * chroma-keying).
 *
 * Sprite crops use the MEASURED constants ported verbatim from the Vue SFC:
 * `FACES`, `FACE_Y`, `FACE_H`. If the sheet changes, re-measure in the
 * browser (density-scan) — never eyeball.
 */
import { useEffect, useRef } from "react";
import {
  Area,
  AreaChart,
  cssColor,
  DitherAvatar,
  DitherButton,
  DitherGradient,
  type DitherColor,
} from "@dither-kit";
import { assetPath, routePath } from "@/shared/lib";
import pkg from "../../../package.json";
import "./landing.css";
const teaser = Array.from({ length: 18 }, (_, i) => ({
  v: 5 + Math.sin(i * 0.7) * 2 + Math.sin(i * 1.6) * 1,
}));
const teaserConfig = { v: { color: "blue" as DitherColor } };
const swatches: DitherColor[] = [
  "green",
  "blue",
  "purple",
  "pink",
  "orange",
  "red",
  "grey",
];

// Portraits + their reaction emotes, cropped from faces.webp — a thin band
// sliced out of the source sheet (rows 766..900) so the landing loads ~70KB
// instead of the full 2MB sheet. Y boxes are relative to the band (source − 766).
const FACE_Y = 0;
const FACE_H = 126;
const FACES = [
  { x: 29, w: 97, emote: { x: 1503, y: 25, w: 51, h: 49 } }, // neutral → …
  { x: 147, w: 97, emote: { x: 1273, y: 27, w: 42, h: 38 } }, // smile → heart
  { x: 262, w: 95, emote: { x: 1270, y: 92, w: 36, h: 41 } }, // blush → sparkles
  { x: 378, w: 98, emote: { x: 1529, y: 98, w: 25, h: 27 } }, // wink → note
  { x: 497, w: 96, emote: { x: 1458, y: 24, w: 20, h: 47 } }, // surprised → !
  { x: 832, w: 94, emote: { x: 1334, y: 23, w: 40, h: 40 } }, // excited → star
] as const;

/** Blit a sub-rect of `img` into canvas `c` at device resolution. The CSS
 *  width/height (set inline) reserves layout so there is no CLS; the backing
 *  store is painted at `min(devicePixelRatio, 3)` so the portrait stays sharp
 *  on hi-DPI / 4K. Verbatim from the Vue `blit()`. */
function blit(
  c: HTMLCanvasElement,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  c.getContext("2d")?.drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
}

export function LandingPage() {
  // Array refs (guide §7): one canvas per face + one per emote, indexed by the
  // FACES order. `useRef` arrays are null-out-safe; the blit effect reads
  // `.current[i]` after the image loads.
  const faceEls = useRef<(HTMLCanvasElement | null)[]>([]);
  const emoteEls = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const img = new Image();
    img.src = assetPath("/faces.webp");
    img.onload = () => {
      FACES.forEach((f, i) => {
        const face = faceEls.current[i];
        const emote = emoteEls.current[i];
        if (face) blit(face, img, f.x, FACE_Y, f.w, FACE_H);
        if (emote)
          blit(emote, img, f.emote.x, f.emote.y, f.emote.w, f.emote.h);
      });
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono text-foreground antialiased">
      {/* Header */}
      <header className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-6 text-xs">
        <span className="tracking-tight">dither-ui</span>
        <nav className="flex items-center gap-5 text-muted-foreground">
          <a
            href={routePath("/docs")}
            className="-m-3 p-3 transition-colors hover:text-foreground"
          >
            docs
          </a>
          <a
            href="https://github.com/drvova/dither-ui"
            target="_blank"
            rel="noreferrer"
            className="-m-3 p-3 transition-colors hover:text-foreground"
          >
            github
          </a>
          <a
            href={routePath("/studio")}
            className="-m-3 p-3 transition-colors hover:text-foreground"
          >
            studio →
          </a>
        </nav>
      </header>

      {/* Hero: one statement, one action, one visual. */}
      <main className="relative isolate flex flex-1 flex-col overflow-hidden">
        <DitherGradient
          from="blue"
          direction="up"
          opacity={0.14}
          cell={8}
          className="-z-10"
        />
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 pt-24 pb-14 sm:pt-32">
          <h1 className="reveal max-w-xl text-[clamp(1.75rem,4.5vw,2.75rem)] leading-[1.15] tracking-tight text-balance">
            A dithered UI toolkit for React.
          </h1>
          <p
            className="reveal mt-5 max-w-md text-[13px] leading-relaxed text-muted-foreground [text-wrap:pretty]"
            style={{ "--reveal-delay": "90ms" } as React.CSSProperties}
          >
            Charts, buttons, avatars and gradients — rendered{" "}
            <em className="text-foreground/80">pixel by pixel</em> on canvas.
            Built in the{" "}
            <a
              href={routePath("/studio")}
              className="text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground/60"
            >
              studio
            </a>
            , documented in the{" "}
            <a
              href={routePath("/docs")}
              className="text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground/60"
            >
              docs
            </a>
            .
          </p>
          <div
            className="reveal mt-10"
            style={{ "--reveal-delay": "180ms" } as React.CSSProperties}
          >
            <DitherButton
              color="blue"
              variant="gradient"
              className="px-6 py-3 text-[13px] transition-transform active:scale-[0.96]"
              onClick={() => window.location.assign(routePath("/studio"))}
            >
              Open studio
            </DitherButton>
          </div>
        </div>

        {/* Six moods, one row — hover a face and her emote answers */}
        <p
          className="reveal pb-6 text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70"
          style={{ "--reveal-delay": "260ms" } as React.CSSProperties}
        >
          expressions
        </p>
        <div
          role="img"
          aria-label="Pixel-art character portraits in six expressions"
          className="reveal flex flex-wrap justify-center gap-7 pb-16"
          style={{ "--reveal-delay": "300ms" } as React.CSSProperties}
        >
          {FACES.map((f, i) => (
            <div key={i} className="group relative pt-10">
              {/* CSS size reserves layout (no CLS); blit paints the backing
                  store at device resolution so the portrait stays sharp on
                  hi-DPI / 4K */}
              <canvas
                ref={(el) => {
                  faceEls.current[i] = el;
                }}
                style={{ width: `${f.w}px`, height: `${FACE_H}px` }}
              />
              <canvas
                ref={(el) => {
                  emoteEls.current[i] = el;
                }}
                className="emote absolute top-0 left-1/2"
                style={{
                  width: `${f.emote.w}px`,
                  height: `${f.emote.h}px`,
                }}
              />
            </div>
          ))}
        </div>
      </main>

      {/* Inside the kit: three quiet tiles, one action for the group */}
      <section className="border-t border-border/60">
        <div className="mx-auto w-full max-w-4xl px-6 py-20">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
              inside the kit
            </p>
            <a
              href={routePath("/docs")}
              className="-m-3 p-3 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              read the docs →
            </a>
          </div>
          <div className="mt-12 grid gap-x-12 gap-y-14 sm:grid-cols-3">
            <a href={routePath("/docs")} className="group block">
              <div
                inert
                className="h-24 transition-opacity duration-200 group-hover:opacity-100 sm:opacity-80"
              >
                <AreaChart
                  data={teaser}
                  config={teaserConfig}
                  animate={false}
                  sparkles={false}
                  interactive={false}
                  margins={{ top: 4, right: 0, bottom: 0, left: 0 }}
                >
                  <Area dataKey="v" variant="gradient" />
                </AreaChart>
              </div>
              <h3 className="mt-5 text-[13px] text-foreground/90 transition-colors group-hover:text-foreground">
                Charts
              </h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground [text-wrap:pretty]">
                Area, line, bar, pie and radar — composed from parts, dithered
                per cell.
              </p>
            </a>
            <a href={routePath("/docs")} className="group block">
              <div
                inert
                className="flex h-24 flex-wrap content-center gap-2 transition-opacity duration-200 group-hover:opacity-100 sm:opacity-80"
              >
                <DitherButton color="blue" variant="gradient">
                  Save
                </DitherButton>
                <DitherButton color="green" variant="solid">
                  Run
                </DitherButton>
                {["ada", "grace"].map((n) => (
                  <DitherAvatar key={n} name={n} size={32} animate={false} />
                ))}
              </div>
              <h3 className="mt-5 text-[13px] text-foreground/90 transition-colors group-hover:text-foreground">
                Primitives
              </h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground [text-wrap:pretty]">
                Buttons, avatars, gradients and images — every fill drawn on
                canvas.
              </p>
            </a>
            <a href={routePath("/docs")} className="group block">
              <div
                inert
                className="flex h-24 content-center items-center gap-3 transition-opacity duration-200 group-hover:opacity-100 sm:opacity-80"
              >
                {swatches.map((c) => (
                  <span
                    key={c}
                    className="size-5 rounded-[3px]"
                    style={{ backgroundColor: cssColor(c) }}
                  />
                ))}
              </div>
              <h3 className="mt-5 text-[13px] text-foreground/90 transition-colors group-hover:text-foreground">
                One palette
              </h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground [text-wrap:pretty]">
                Seven seeds; fill, line and sparkle hues resolve from the same
                source.
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* Footer: one quiet line, then the wordmark sinking below the fold */}
      <footer className="overflow-hidden border-t border-border/60">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-6 text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} dither-ui.com</span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/drvova/dither-ui"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <span className="tabular-nums">v{pkg.version} · MIT</span>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none -mb-[0.34em] select-none text-center text-[clamp(5rem,19vw,15rem)] leading-none font-medium tracking-tighter whitespace-nowrap text-foreground/[0.045]"
        >
          dither-ui
        </div>
      </footer>
    </div>
  );
}
