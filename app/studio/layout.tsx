import type { Metadata } from "next";

/**
 * Studio route layout — owns the route-segment metadata (guide §11). The
 * studio page (`app/studio/page.tsx`) is owned by the studio worker; this
 * layout sets the segment title/description.
 */
export const metadata: Metadata = {
  title: "Studio — Build dithered interfaces",
  description:
    "A Figma-style editor for composing dithered interfaces — multi-artboard, live code export.",
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
