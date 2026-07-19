/**
 * Overview pack — the "Quick start" section. Port of the `getting-started`
 * section in `src/pages/docs/DocsPage.vue` (template lines 816-841).
 *
 * Handbook prose + a CodeBlock install snippet (no DemoCard).
 */
import { CodeBlock } from "./CodeBlock";
import { SNIPPETS } from "./docs-snippets";

export function OverviewPack() {
  return (
    <section id="getting-started" className="mt-16 scroll-mt-24">
      <h2 className="text-lg tracking-tight">Quick start</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        The kit is a folder, not a package. Copy{" "}
        <code className="text-foreground/80">dither-kit/</code> straight from the{" "}
        <a
          href="https://github.com/drvova/dither-ui"
          target="_blank"
          rel="noreferrer"
          className="text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground/60"
        >
          GitHub repo
        </a>
        , install four small runtime deps, and alias it — React 19 and Tailwind
        you already have.
      </p>
      <div className="mt-5">
        <CodeBlock code={SNIPPETS.install} />
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground/80">
        Prefer to read the source first? Every component lives under{" "}
        <a
          href="https://github.com/drvova/dither-ui/tree/master/dither-kit"
          target="_blank"
          rel="noreferrer"
          className="text-foreground/80 underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground/60"
        >
          dither-kit/
        </a>{" "}
        — no build step, no black box.
      </p>
    </section>
  );
}
