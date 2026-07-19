"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { routePath } from "@/shared/lib";

/**
 * LegacyHashRedirect — migrates Vue-era hash URLs to canonical App Router
 * paths on mount. Verbatim port of the in-place `history.replaceState`
 * migration in `src/app/App.vue` (guide §11).
 *
 * Hash is client-only, so middleware can't see it; this client component
 * reads `window.location.hash` once on mount and `router.replace()`s to the
 * canonical path:
 *   `/#/docs/<id>`          → `/docs/<id>`
 *   `/#/studio/new/<type>`  → `/studio#new/<type>`
 *   `/#/studio`             → `/studio`
 *
 * Runs once per mount; the App Router handles subsequent navigation.
 */
export function LegacyHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || !hash.startsWith("#/")) return;

    // `/#/docs/<section>` → `/docs/<section>`
    if (hash.startsWith("#/docs")) {
      const path = hash.replace(/^#/, "");
      router.replace(routePath(path));
      return;
    }

    // `/#/studio/new/<type>` → `/studio#new/<type>`
    // `/#/studio`            → `/studio`
    if (hash.startsWith("#/studio")) {
      const rest = hash.replace(/^#\/studio\/?/, "");
      const target = rest ? `/studio#${rest}` : "/studio";
      router.replace(routePath(target));
    }
  }, [router]);

  return null;
}
