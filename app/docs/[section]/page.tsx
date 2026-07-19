import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsShellClient } from "@/views/docs/DocsShellClient";
import { SectionContent } from "@/views/docs/SectionContent";
import {
  SECTION_IDS,
  SECTION_LABEL,
  packOf,
} from "@/views/docs/nav-registry";

/**
 * `/docs/<section>` — the section page. Server Component: owns the route
 * `metadata` (title per section) and `generateStaticParams` (pre-renders every
 * section page at build). The client shell (`DocsShellClient`) wraps the
 * section pack with the chrome header + scroll-spy sidebar.
 *
 * Legacy `#/docs/<id>` deep links are migrated to canonical `/docs/<id>` by
 * the appshell's `<LegacyHashRedirect>`; this page just reads `params.section`.
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

  const pack = packOf(section);
  return (
    <DocsShellClient section={section}>
      <SectionContent pack={pack} />
    </DocsShellClient>
  );
}
