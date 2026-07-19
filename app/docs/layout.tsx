import type { Metadata } from "next";

/**
 * Docs route layout — owns the route-segment metadata (guide §11). The docs
 * page(s) (`app/docs/page.tsx`, `app/docs/[section]/page.tsx`) are owned by
 * the docs worker; this layout just sets the segment title/description.
 */
export const metadata: Metadata = {
  title: "Components and chart documentation",
  description:
    "Dithered React components and chart documentation — props, variants, and live demos.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
