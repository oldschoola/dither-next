"use client";

import { useState } from "react";

/**
 * CodeBlock — a copyable code panel. Port of `src/shared/ui/CodeBlock.vue`.
 *
 * The Vue `<pre><code>` + copy button becomes a client component (clipboard
 * is browser-only). The appshell worker owns `@/shared/ui`; the docs module
 * vendors its own copy here so the docs port is self-contained and doesn't
 * depend on a not-yet-ported shared module (guide §11 — `@/shared/ui` is
 * appshell-owned; this is a local fallback until that lands).
 */
export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative rounded-lg border border-transparent bg-background/60 shadow-[0_0_0_1px_rgba(255,255,255,0.07)]">
      <button
        type="button"
        className="absolute right-2 top-2 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        onClick={copy}
      >
        {copied ? "copied" : "copy"}
      </button>
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}
