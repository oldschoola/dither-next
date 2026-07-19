"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SECTION_IDS } from "./nav-registry";
import {
  DocsChrome,
  DocsMobileNav,
  DocsSidebar,
  useDeepLinkScroll,
  useScrollSpy,
} from "./DocsShell";

/**
 * DocsShellClient — the docs chrome + scroll-spy shell. Client component
 * because it owns `activeId` (IntersectionObserver), handles deep-link scroll,
 * and pushes the active section into the URL via `router.replace`.
 *
 * Port of the Vue `DocsPage.vue` wayfinding: scroll-spy sets `activeId` +
 * `aria-current`; clean `/docs/<id>` deep links restore and stay shareable.
 * (Legacy `#/docs/<id>` is handled at the appshell level by
 * `<LegacyHashRedirect>`; this page just reads the canonical path.)
 */
export function DocsShellClient({
  section,
  children,
}: {
  section: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(section);

  useDeepLinkScroll(section);
  useScrollSpy((id) => {
    setActiveId(id);
    // Keep the URL in sync with the section in view (shareable + reload-safe).
    if (SECTION_IDS.includes(id) && id !== section) {
      router.replace(`/docs/${id}`);
    }
  });

  const navigate = useCallback((id: string) => {
    if (typeof document !== "undefined") {
      document.getElementById(id)?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-background font-mono text-foreground antialiased">
      <DocsChrome />
      <div className="mx-auto flex w-full max-w-6xl px-6">
        <DocsSidebar activeId={activeId} onNavigate={navigate} />
        <main className="min-w-0 flex-1 pb-24 lg:pl-10">
          <div className="max-w-2xl">
            <h1 className="mt-12 text-2xl tracking-tight">Components</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground [text-wrap:pretty]">
              Every component draws on canvas through the same ordered-dither
              engine. Compose charts from parts, or drop in a single primitive.
            </p>
            <DocsMobileNav activeId={activeId} onNavigate={navigate} />
            {children}
          </div>
        </main>
      </div>
      <footer className="border-t border-border/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 text-[11px] text-muted-foreground">
          <Link href="#" className="transition-colors hover:text-foreground">
            ← dither-ui.com
          </Link>
          <span>MIT</span>
        </div>
      </footer>
    </div>
  );
}
