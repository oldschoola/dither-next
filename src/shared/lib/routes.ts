/**
 * Base-path helpers — thin shim over Next.js `basePath` so a single build
 * works at `/` and at a project-URL deploy (e.g. GitHub Pages).
 *
 * Vue app (`src/shared/lib/routes.ts`) read `import.meta.env.BASE_URL`. In
 * Next.js the framework prefixes `next/link` automatically, but non-`Link`
 * usages (anchors, asset URLs, history.replaceState) still need the base.
 * We back this with `process.env.NEXT_BASE_PATH` (see `next.config.ts`).
 *
 * Per CONVERSION-GUIDE.md §11.
 */

const rawBase = process.env.NEXT_BASE_PATH || "/";

const base = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

/**
 * Strip the base prefix from a pathname, returning the app-relative path.
 * Client-only (reads `window.location.pathname`); pass an explicit pathname
 * to stay testable / SSR-safe.
 */
export function appPathname(pathname?: string): string {
  const path = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  if (!base) return path || "/";
  if (path === base) return "/";
  if (path.startsWith(`${base}/`)) return path.slice(base.length) || "/";
  return path || "/";
}

/** Prefix an app-relative path with the configured base path. */
export function routePath(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!base) return normalized;
  return normalized === "/" ? `${base}/` : `${base}${normalized}`;
}

/** Prefix a public asset path with the raw base (no trailing-slash trim). */
export function assetPath(path: string): string {
  return `${rawBase}${path.replace(/^\//, "")}`;
}
