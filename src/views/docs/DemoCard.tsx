"use client";

import { useState } from "react";

import { CodeBlock } from "./CodeBlock";

/**
 * DemoCard — Preview/Code tabbed container. Port of `src/pages/docs/DemoCard.vue`.
 *
 * A client component because the tab state is interactive. The preview slot
 * holds the live canvas demo; the code tab mirrors exactly what the demo
 * renders (computed by the parent from the same picked state).
 */
export function DemoCard({ code, children }: { code: string; children: React.ReactNode }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");

  return (
    <div className="mt-6">
      <div className="flex gap-4 text-[12px]" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "preview"}
          className={`border-b pb-2 transition-colors ${
            tab === "preview"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("preview")}
        >
          Preview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "code"}
          className={`border-b pb-2 transition-colors ${
            tab === "code"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("code")}
        >
          Code
        </button>
      </div>
      {tab === "preview" ? (
        <div className="mt-3 flex min-h-[280px] items-center justify-center rounded-lg border border-border/60 p-8 sm:p-10">
          <div className="w-full">{children}</div>
        </div>
      ) : (
        <div className="mt-3">
          <CodeBlock code={code} />
        </div>
      )}
    </div>
  );
}
