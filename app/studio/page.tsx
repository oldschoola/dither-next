"use client";

import { StudioPage } from "@/views/studio";

/**
 * Studio route page — client-only (guide §11.11). The studio is canvas-heavy,
 * pointer + keyboard interactive, so the entire page is a client component.
 * The route-segment metadata lives in `app/studio/layout.tsx`.
 */
export default function StudioRoute() {
  return <StudioPage />;
}
