"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

import { routePath } from "@/shared/lib";
import { GROUPS, SECTION_IDS } from "./nav-registry";

/**
 * DocsSidebar — sticky left rail with the section IA. Port of the `<aside>`
 * block in `src/pages/docs/DocsPage.vue`.
 *
 * The sidebar renders every group + its items as deep links. `activeId` (from
 * the route page's scroll-spy) drives `aria-current`; a click scrolls to the
 * section in-view and updates the URL via the route.
 *
 * On mobile (`<lg`) the rail is hidden; the DocsShell renders an inline mobile
 * nav instead.
 */
export function DocsSidebar({
  activeId,
  onNavigate,
}: {
  activeId: string;
  onNavigate?: (id: string) => void;
}) {
  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-52 shrink-0 overflow-y-auto py-10 pr-8 lg:block">
      <nav className="grid gap-7">
        {GROUPS.map((grp) => (
          <div key={grp.title}>
            <div className="text-[11px] font-medium text-foreground">{grp.title}</div>
            <ul className="mt-2.5 grid gap-1.5 border-l border-border/60">
              {grp.items.map((it) => {
                const active = activeId === it.id;
                return (
                  <li key={it.id}>
                    <Link
                      href={`/docs/${it.id}`}
                      aria-current={active ? "true" : undefined}
                      className={`-ml-px block border-l py-0.5 pl-3 text-[11px] transition-colors ${
                        active
                          ? "border-foreground text-foreground"
                          : "border-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                      }`}
                      onClick={() => onNavigate?.(it.id)}
                    >
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** Mobile nav — the inline chip row shown under the intro on small screens. */
export function DocsMobileNav({
  activeId,
  onNavigate,
}: {
  activeId: string;
  onNavigate?: (id: string) => void;
}) {
  const items = GROUPS.flatMap((g) => g.items);
  return (
    <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground lg:hidden">
      {items.map((it) => (
        <Link
          key={it.id}
          href={`/docs/${it.id}`}
          onClick={() => onNavigate?.(it.id)}
          className={`transition-colors hover:text-foreground ${
            activeId === it.id ? "text-foreground" : ""
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * useScrollSpy — IntersectionObserver scroll-spy. Port of the `onMounted`
 * observer in `src/pages/docs/DocsPage.vue`.
 *
 * Observes every section element; the topmost visible section wins. The
 * `-56px 0px -50% 0px` rootMargin compensates for the 56px sticky chrome and
 * triggers in the upper half (matching the Vue kit verbatim).
 */
export function useScrollSpy(onChange: (id: string) => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.id;
        if (id) onChangeRef.current(id);
      },
      { rootMargin: "-56px 0px -50% 0px" },
    );

    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);
}

/**
 * useDeepLinkScroll — on mount, if the current section's element exists,
 * scroll it into view (manual restoration so the browser's own restore
 * doesn't override). Mirrors the Vue `history.scrollRestoration = "manual"` +
 * double-jump (now + 450ms) to handle canvas-heavy sections that grow late.
 */
export function useDeepLinkScroll(sectionId: string) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!SECTION_IDS.includes(sectionId)) return;

    history.scrollRestoration = "manual";
    const jump = () => document.getElementById(sectionId)?.scrollIntoView();
    requestAnimationFrame(jump);
    const t = window.setTimeout(jump, 450);
    return () => window.clearTimeout(t);
  }, [sectionId]);
}

/**
 * DocsChrome — the translucent material header. Port of the `<header
 * class="chrome">` block. The `.chrome` styles live in `app/globals.css`
 * (appshell-owned); here we just apply the class + layout.
 */
export function DocsChrome() {
  return (
    <header className="chrome sticky top-0 z-40">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6 text-xs">
        <div className="flex items-center gap-6">
          <Link
            href={routePath("/")}
            className="tracking-tight transition-colors hover:text-foreground"
          >
            dither-ui
          </Link>
          <span className="hidden text-muted-foreground sm:inline">docs</span>
        </div>
        <nav className="flex items-center gap-5 text-muted-foreground">
          <a
            href="https://github.com/drvova/dither-ui"
            target="_blank"
            rel="noreferrer"
            className="-m-3 p-3 transition-colors hover:text-foreground"
          >
            github
          </a>
          <Link
            href={routePath("/studio")}
            className="-m-3 p-3 transition-colors hover:text-foreground"
          >
            studio →
          </Link>
        </nav>
      </div>
    </header>
  );
}
