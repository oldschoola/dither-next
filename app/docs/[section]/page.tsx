import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsShellClient } from "@/views/docs/DocsShellClient";
import { DocsSections } from "@/views/docs/SectionContent";
import {
  SECTION_IDS,
  SECTION_LABEL,
} from "@/views/docs/nav-registry";

/**
 * `/docs/<section>` — the docs page. Server Component: owns the route
 * `metadata` (title per section) and `generateStaticParams` (pre-renders every
 * section URL at build). The client shell (`DocsShellClient`) wraps the FULL
 * docs body with the chrome header + scroll-spy sidebar.
 *
 * Matches the Vue docs page model: ONE long scrollable page renders every
 * section pack concatenated in nav-registry order (Overview · Handbook ·
 * Examples · Components · Utils). The `[section]` param is the deep-link
 * TARGET — `DocsShellClient` scrolls `<section id={section}>` into view on
 * mount (`useDeepLinkScroll`). Scrolling updates the sidebar's active item via
 * the IntersectionObserver scroll-spy and keeps the URL in sync with
 * `history.replaceState`, so every `/docs/<id>` is a shareable deep link to
 * the same long page. (Legacy `#/docs/<id>` is migrated to canonical
 * `/docs/<id>` by the appshell's `<LegacyHashRedirect>`.)
 *
 * Previously this route rendered only the single pack for `packOf(section)`;
 * that split the Vue long page across routes and meant `/docs/getting-started`
 * could not scroll to "Palette". All packs now render on every section URL.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SECTION_IDS.map((section) => ({ section }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  // `params` is a Promise in Next 15 — await it, then build the title from the
  // section label (e.g. "Area Chart — dither-ui docs").
  return params.then((p) => {
    const label = SECTION_LABEL[p.section];
    return {
      title: label ? `${label} — dither-ui docs` : "dither-ui docs",
      description: label
        ? `${label} — dithered React component documentation, props, and live demos.`
        : "Dithered React component documentation.",
    };
  });
}

export default async function DocsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!SECTION_IDS.includes(section)) notFound();

  return (
    <DocsShellClient section={section}>
      <DocsSections />
    </DocsShellClient>
  );
}
