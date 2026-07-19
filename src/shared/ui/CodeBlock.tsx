"use client";

import { useState } from "react";

export interface CodeBlockProps {
  code: string;
}

/**
 * CodeBlock — a copy-to-clipboard code panel. Verbatim port of
 * `src/shared/ui/CodeBlock.vue`. The Vue SFC's `copied` ref + 1400ms reset
 * becomes local `useState`.
 */
export function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
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
