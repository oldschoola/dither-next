"use client";

import { DitherDrawerIndent, DitherToaster } from "@dither-kit";
import { ThemeProvider } from "@/shared/lib";
import { LegacyHashRedirect } from "./LegacyHashRedirect";

/**
 * AppProviders — client wrapper for the cross-cutting app providers.
 *
 * `app/layout.tsx` is a Server Component (so it can export `metadata`), but
 * the kit providers (`DitherDrawerIndent`, `DitherToaster`) and
 * `ThemeProvider` use React hooks and must run on the client. This wrapper
 * is marked `"use client"` and mounts them in the correct order (guide §11):
 *
 *   <ThemeProvider>          — dark/light toggle on <html> (defaults dark)
 *   <DitherDrawerIndent>      — app-level drawer channel (guide §3)
 *   <DitherToaster>          — renders the module-level toast store (portal)
 *   <LegacyHashRedirect>      — migrates legacy #/docs #/studio hash URLs
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultDark>
      <DitherDrawerIndent>
        {children}
        <DitherToaster />
      </DitherDrawerIndent>
      <LegacyHashRedirect />
    </ThemeProvider>
  );
}
